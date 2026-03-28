import os
import shutil
import time

from pyload.core.utils.fs import safejoin

from ..base.addon import BaseAddon
from ...core.datatypes.enums import Destination


class HotFolder(BaseAddon):
    __name__ = "HotFolder"
    __type__ = "addon"
    __version__ = "0.27"
    __status__ = "testing"

    __config__ = [
        ("enabled", "bool", "Activated", False),
        ("folder", "folder", "Folder to watch", "watchdir"),
        ("watchfile", "bool", "Watch link file", False),
        ("delete", "bool", "Delete added containers", False),
        ("file", "str", "Link file", "links.txt"),
        ("interval", "int", "File / folder check interval in seconds (minimum 20)", 60),
        ("enable_extension_filter", "bool", "Extension filter", False),
        ("extension_filter", "str", "Extensions to look for (comma separated)", "dlc"),
        ("add_to", "Packages;Queue", "Add files to", "Queue"),
    ]

    __description__ = (
        """Observe folder and file for changes and add container and links"""
    )
    __license__ = "GPLv3"
    __authors__ = [
        ("RaNaN", "RaNaN@pyload.de"),
        ("GammaC0de", "nitzo2001[AT]yahoo[DOT]com"),
    ]

    def activate(self):
        self.extensions = None
        if self.config.get("enable_extension_filter"):
            extension_filter = self.config.get("extension_filter")
            self.extensions = [s.strip() for s in extension_filter.split(",")]
            self.log_info(
                self._("Watching only for extensions {}").format(self.extensions)
            )

        interval = max(self.config.get("interval"), 20)
        self.periodical.start(interval, threaded=True)

    def periodical_task(self):
        watch_folder = os.fsdecode(self.config.get("folder"))
        watch_file = os.fsdecode(self.config.get("file"))
        add_to = (
            Destination.COLLECTOR
            if self.config.get("add_to") == "Packages"
            else Destination.QUEUE
        )

        finished_dir = safejoin(watch_folder, "finished")

        try:
            if not os.path.isdir(finished_dir):
                os.makedirs(finished_dir, exist_ok=True)

            if self.config.get("watchfile"):
                with open(watch_file, mode="a+") as fp:
                    fp.seek(0)
                    content = fp.read().strip()

                if content:
                    fp = open(watch_file, mode="w")
                    fp.close()

                    watch_file_name = os.path.basename(watch_file) or "links.txt"
                    name = "{}_{}.txt".format(
                        watch_file_name, time.strftime("%H-%M-%S_%d%b%Y")
                    )

                    with open(
                        safejoin(finished_dir, name), mode="w"
                    ) as fp:
                        fp.write(content)

                    self.pyload.api.add_package(name, [fp.name], add_to)

            for entry in os.listdir(watch_folder):
                entry_name = os.path.basename(entry)
                entry_file = safejoin(watch_folder, entry_name)

                if (
                    not os.path.isfile(entry_file)
                    or entry.endswith("~")
                    or entry.startswith("#")
                    or entry.startswith(".")
                    or os.path.realpath(watch_file) == os.path.realpath(entry_file)
                ):
                    continue

                if self.extensions is not None:
                    extension = os.path.splitext(entry)[1]
                    # Note that extension contains the leading dot
                    if len(extension) == 0 or extension[1:] not in self.extensions:
                        continue

                new_name = "tmp_" + entry_name if self.config.get("delete") else entry_name
                new_path = safejoin(finished_dir, new_name)
                shutil.move(entry_file, new_path)

                self.log_info(self._("Added {} from HotFolder").format(entry_name))
                self.pyload.api.add_package(entry_name, [new_path], add_to)

        except (IOError, OSError) as exc:
            self.log_error(
                exc, exc_info=self.pyload.debug > 1, stack_info=self.pyload.debug > 2
            )
