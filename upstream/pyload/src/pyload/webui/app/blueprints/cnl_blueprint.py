import os
from base64 import standard_b64decode
from functools import wraps
from logging import getLogger
from urllib.parse import unquote, urlsplit

import flask
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from werkzeug.utils import secure_filename

from pyload import APPID, g
from pyload.core.api import Destination
from pyload.core.utils.convert import to_str
from pyload.core.utils.fs import safejoin
from pyload.core.utils.misc import eval_js

from ..helpers import csrf_exempt

#: url_prefix here is intentional since it should not be affected by path prefix
bp = flask.Blueprint("flash", __name__, url_prefix="/")
log = getLogger(APPID)

LOCAL_LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost"}
LOCAL_LOOPBACK_ADDRS = {"127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"}


def _get_url_host(value):
    if not value:
        return None

    try:
        return urlsplit(value).hostname
    except ValueError:
        return None


def _is_local_request():
    remote_addr = flask.request.environ.get("REMOTE_ADDR") or flask.request.remote_addr
    if remote_addr in LOCAL_LOOPBACK_ADDRS:
        return True

    local_addr = g.get("web_addr")
    return bool(local_addr and remote_addr == local_addr)


def _is_loopback_web_origin(value):
    return _get_url_host(value) in LOCAL_LOOPBACK_HOSTS


#: decorators
def local_check(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if _is_local_request():
            return func(*args, **kwargs)

        return "Forbidden", 403

    return wrapper


def config_check(config_key: list[str], not_found_msg: str = "Not Found"):
    """
    Decorator factory: Checks [config_key] config value and aborts with 404 if False.

    :param config_key: The config key to check (e.g., ["ClickNLoad", "enabled", "plugin"]).
    :param not_found_msg: Custom message for the 404 response.
    :return: A decorator to wrap view functions.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            api = flask.current_app.config["PYLOAD_API"]
            if not api.get_config_value(*config_key):
                return not_found_msg, 404
            return f(*args, **kwargs)
        return decorated_function
    return decorator


@bp.after_request
def add_cors(response):
    origin = flask.request.headers.get("Origin")

    if _is_local_request() and _is_loopback_web_origin(origin):
        response.headers.update({
            'Access-Control-Max-Age': 1800,
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': "OPTIONS, GET, POST",
            'Vary': "Origin",
        })

    return response


@bp.route("/flash/", methods=["GET", "POST"], endpoint="index")
@bp.route("/flash/<id>", methods=["GET", "POST"], endpoint="index")
@config_check(["ClickNLoad", "enabled", "plugin"], "Click'N'Load is disabled")
@local_check
@csrf_exempt
def index(id="0"):
    return "JDownloader\r\n"


@bp.route("/flash/add", methods=["POST"], endpoint="add")
@config_check(["ClickNLoad", "enabled", "plugin"], "Click'N'Load is disabled")
@local_check
@csrf_exempt
def add():
    package = flask.request.form.get(
        "package", flask.request.form.get("source", flask.request.form.get("referer"))
    )

    urls = [url.strip() for url in unquote(flask.request.form["urls"]).replace(' ', '\n').split("\n") if url.strip()]
    if not urls:
        return "failed no urls\r\n", 500

    pack_password = flask.request.form.get("passwords")

    api = flask.current_app.config["PYLOAD_API"]
    try:
        if package:
            pack = api.add_package(package, urls, Destination.COLLECTOR)
        else:
            pack = api.generate_and_add_packages(urls, Destination.COLLECTOR)
    except Exception:
        log.exception("Unhandled exception in Click'N'Load add")
        return "failed\r\n", 500

    if pack_password:
        api.set_package_data(pack, {"password": pack_password})

    return "success\r\n"


@bp.route("/flash/addcrypted", methods=["POST"], endpoint="addcrypted")
@config_check(["ClickNLoad", "enabled", "plugin"], "Click'N'Load is disabled")
@local_check
@csrf_exempt
def addcrypted():
    api = flask.current_app.config["PYLOAD_API"]

    package = flask.request.form.get(
        "package", flask.request.form.get("source", flask.request.form.get("referer"))
    )
    dl_path = api.get_config_value("general", "storage_folder")
    package_fs_name = secure_filename(os.path.basename(package or "")) or "package"
    dlc_filename = package_fs_name + ".dlc"
    dlc_path = safejoin(dl_path, dlc_filename)
    dlc = flask.request.form["crypted"].replace(" ", "+")
    with open(dlc_path, mode="wb") as fp:
        fp.write(dlc)

    pack_password = flask.request.form.get("passwords")

    try:
        pack = api.add_package(package, [dlc_path], Destination.COLLECTOR)
    except Exception:
        log.exception("Unhandled exception in Click'N'Load addcrypted")
        return "failed\r\n", 500
    else:
        if pack_password:
            api.set_package_data(pack, {"password": pack_password})

        return "success\r\n"


@bp.route("/flash/addcrypted2", methods=["POST"], endpoint="addcrypted2")
@config_check(["ClickNLoad", "enabled", "plugin"], "Click'N'Load is disabled")
@local_check
@csrf_exempt
def addcrypted2():
    def decrypt(crypted: bytes, key: bytes, IV: bytes) -> str:
        cipher = Cipher(
            algorithms.AES(key), modes.CBC(IV), backend=default_backend()
        )
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(crypted) + decryptor.finalize()

        try:
            unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
            decrypted = unpadder.update(decrypted) + unpadder.finalize()
        except ValueError:
            pass

        decrypted = decrypted.replace(b"\x00", b"")
        return to_str(decrypted).strip()

    package = flask.request.form.get(
        "package", flask.request.form.get("source", flask.request.form.get("referer"))
    )
    crypted = flask.request.form["crypted"]
    jk = flask.request.form["jk"]
    pack_password = flask.request.form.get("passwords")

    crypted = standard_b64decode(unquote(crypted.replace(" ", "+")))
    if len(crypted) % 16 != 0:
        return "Encrypted data length must be multiple of 16 bytes", 500

    try:
        jk = eval_js(f"{jk} f()")
        key = bytes.fromhex(jk)
    except ValueError:
        return "Could not decrypt key", 500

    if len(key) != 16:
        return "Key must be 16 bytes", 500

    try:
        decrypted_urls = decrypt(crypted, key, key)
    except UnicodeDecodeError:
        try:
            decrypted_urls = decrypt(crypted[16:], key, crypted[:16])
        except UnicodeDecodeError:
            return "Decrypted output is invalid UTF-8", 500

    urls = [url for url in decrypted_urls.splitlines()]

    api = flask.current_app.config["PYLOAD_API"]
    try:
        if package:
            pack = api.add_package(package, urls, Destination.COLLECTOR)
        else:
            pack = api.generate_and_add_packages(urls, Destination.COLLECTOR)
    except Exception:
        log.exception("Unhandled exception in Click'N'Load addcrypted2")
        return "failed\r\n", 500
    else:
        if pack_password:
            api.set_package_data(pack, {"password": pack_password})

        return "success\r\n"


@bp.route("/flashgot", methods=["POST"], endpoint="flashgot")
@bp.route("/flashgot_pyload", methods=["POST"], endpoint="flashgot")
@config_check(["ClickNLoad", "enabled", "plugin"], "Click'N'Load is disabled")
@local_check
@csrf_exempt
def flashgot():
    referrer = flask.request.referrer

    if not _is_loopback_web_origin(referrer) or urlsplit(referrer).path != "/flashgot":
        return "Forbidden", 403

    package = flask.request.form.get("package")
    urls = [url for url in flask.request.form["urls"].split("\n") if url.strip()]
    # folder = flask.request.form.get('dir', None)
    autostart = int(flask.request.form.get("autostart", 0))

    api = flask.current_app.config["PYLOAD_API"]
    try:
        if package:
            api.add_package(package, urls, Destination.QUEUE if autostart else Destination.COLLECTOR)
        else:
            api.generate_and_add_packages(urls, Destination.QUEUE if autostart else Destination.COLLECTOR)
    except Exception:
        log.exception("Unhandled exception in Click'N'Load flashgot")
        return "failed\r\n", 500

    return "success\r\n"


@bp.route("/crossdomain.xml", endpoint="crossdomain")
@config_check(["ClickNLoad", "enabled", "plugin"], "Click'N'Load is disabled")
@local_check
@csrf_exempt
def crossdomain():
    rep = '<?xml version="1.0"?>\n'
    rep += '<!DOCTYPE cross-domain-policy SYSTEM "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">\n'
    rep += "<cross-domain-policy>\n"
    rep += '<allow-access-from domain="*" />\n'
    rep += "</cross-domain-policy>"
    return rep


@bp.route("/flash/checkSupportForUrl", methods=["POST"], endpoint="checksupport")
@config_check(["ClickNLoad", "enabled", "plugin"], "Click'N'Load is disabled")
@local_check
@csrf_exempt
def checksupport():
    api = flask.current_app.config["PYLOAD_API"]

    url = flask.request.form["url"]
    res = api.check_urls([url])

    supported = not res[0][1] is None
    return str(supported).lower()


@bp.route("/jdcheck.js", endpoint="jdcheck")
@config_check(["ClickNLoad", "enabled", "plugin"], "Click'N'Load is disabled")
@local_check
@csrf_exempt
def jdcheck():
    rep = "jdownloader=true;\r\n"
    rep += "var version='42707';\r\n"
    return rep
