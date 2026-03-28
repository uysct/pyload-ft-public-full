{% autoescape true %}

class PackageUI {
  constructor(type) {
    this.type = type;
    this.packages = [];
    this.initialize();
  }

  removePackage(packageInstance) {
    this.packages = this.packages.filter(pack =>
      pack !== packageInstance &&
      pack.id?.[0] !== packageInstance.id?.[0]
    );
  }

  initialize() {
    $("#del_finished").click(() => this.deleteFinished());
    $("#restart_failed").click(() => this.restartFailed());
    $("#pack_box .modal-content").resizable({
      handles: "e,w",
      minHeight: 420,
      minWidth: 300
    }).draggable({ scroll: false }).append(
      '<div class="ui-resizable-handle ui-resizable-se ui-icon ui-icon-gripsmall-diagonal-se" style="cursor: default;"></div>'
    );
    this.parsePackages();
  }

  parsePackages() {
    const $packageList = $("#package-list");
    const lis = $packageList.children("li");
    for (let i = 0, len = lis.length; i < len; i++) {
      const ele = lis[i];
      const id = ele.id.match(/[0-9]+/);
      this.packages.push(new Package(this, id, ele));
    }

    $packageList.sortable({
      handle: ".progress",
      axis: "y",
      cursor: "grabbing",
      start(event, ui) {
        $(this).attr('data-previndex', ui.item.index());
      },
      stop(event, ui) {
        const newIndex = ui.item.index();
        const oldIndex = $(this).attr('data-previndex');
        $(this).removeAttr('data-previndex');
        if (newIndex === oldIndex) {
          return false;
        }
        uiHandler.indicateLoad();
        $.get({
          url: "{{url_for('json.package_order')}}",
          data: { pid: ui.item.data('pid'), pos: newIndex },
          traditional: true,
          success: () => {
            uiHandler.indicateFinish();
            return true;
          }
        }).fail(() => {
          uiHandler.indicateFail();
          return false;
        });
      }
    });
  }

  deleteFinished() {
    uiHandler.indicateLoad();
    $.post("{{url_for('api.rpc', func='delete_finished')}}")
      .done((data) => {
        if (data.length > 0) {
          window.location.assign(window.location.origin + window.location.pathname + window.location.search);
        } else {
          this.packages.forEach(pack => pack.close());
        }
        uiHandler.indicateSuccess();
      })
      .fail(() => {
        uiHandler.indicateFail();
      });
  }

  restartFailed() {
    uiHandler.indicateLoad();
    $.post("{{url_for('api.rpc', func='restart_failed')}}")
      .done((data) => {
        if (data.length > 0) {
          this.packages.forEach(pack => pack.close());
        }
        uiHandler.indicateSuccess();
      })
      .fail(() => {
        uiHandler.indicateFail();
      });
  }
}

class Package {
  constructor(ui, id, ele) {
    this.ui = ui;
    this.id = id;
    this.ele = ele;
    this.linksLoaded = false;
    this.linksLoading = false;
    this.linkEventsBound = false;
    this.initialize();
  }

  initialize() {
    this.$ele = $(this.ele);
    this.$pname = this.$ele.find('.packagename');
    this.buttons = this.$ele.find('.buttons');

    if (!this.ele) {
      this.createElement();
    } else {
      jQuery.data(this.ele, "pid", this.id);
      this.parseElement();
    }

    this.buttons.css({ opacity: 0, transition: 'opacity 120ms linear' });

    this.$pname.on('mouseenter', () => this.buttons.css('opacity', 1));
    this.$pname.on('mouseleave', () => this.buttons.css('opacity', 0));
  }

  createElement() {
    alert("create");
  }

  parseElement() {
    const imgs = this.$ele.find('span');
    this.name = this.$ele.find('.name');
    this.folder = this.$ele.find('.folder');
    this.password = this.$ele.find('.password');
    this.$icon = this.$ele.find('.packageicon');
    this.$children = this.$ele.find('.children');
    this.$childrenList = this.$children.children('ul');
    this.childrenListElement = this.$childrenList.get(0);

    $(imgs[3]).on('click', (e) => this.deletePackage(e));
    $(imgs[4]).on('click', (e) => this.restartPackage(e));
    $(imgs[5]).on('click', (e) => this.editPackage(e));
    $(imgs[6]).on('click', (e) => this.movePackage(e));
    $(imgs[7]).on('click', (e) => this.editOrder(e));
    $(imgs[8]).on('click', (e) => this.extractPackage(e));

    this.$pname.on('click', () => this.toggle());
  }

  loadLinks() {
    if (this.linksLoading) {
      return;
    }

    this.linksLoading = true;
    uiHandler.indicateLoad();

    $.get({
      url: "{{url_for('json.package')}}",
      data: { id: this.id },
      traditional: true
    })
      .done((data) => {
        this.createLinks(data);
      })
      .fail(() => {
        uiHandler.indicateFail();
      })
      .always(() => {
        this.linksLoading = false;
      });
  }

  createLinks(data) {
    const listElement = this.childrenListElement || document.getElementById(`sort_children_${this.id[0]}`);
    this.childrenListElement = listElement;
    if (!listElement) {
      return;
    }

    const fragment = document.createDocumentFragment();
    data.links.forEach(link => {
      link.id = link.fid;
      const li = document.createElement("li");
      li.style.marginLeft = "0";

      link.icon = this.getLinkIcon(link.status);

      const html = `
        <span class='child_status'>
          <span style='margin-right: 2px;color: #337ab7;' class='${link.icon}'></span>
        </span>
        <span style='font-size: 16px; font-weight: bold;'>
          <a onclick='return false' href='${link.url}'>${link.name}</a>
        </span><br/>
        <div class='child_secrow' style='margin-left: 21px; margin-bottom: 7px; border-radius: 4px;'>
          <span class='child_status' style='font-size: 12px; color:#555; padding-left: 5px;'>${link.statusmsg}</span>&nbsp;${link.error}&nbsp;
          <span class='child_status' style='font-size: 12px; color:#555;'>${link.format_size}</span>
          <span class='child_status' style='font-size: 12px; color:#555;'> ${link.plugin}</span>&nbsp;&nbsp;
          <span class='glyphicon glyphicon-trash child-action-delete' data-action='delete-link' title='{{_('Delete Link')}}' style='cursor: pointer; font-size: 12px; color:#333;'></span>&nbsp;&nbsp;
          <span class='glyphicon glyphicon-repeat child-action-restart' data-action='restart-link' title='{{_('Restart Link')}}' style='cursor: pointer; font-size: 12px; color:#333;'></span>
        </div>`;

      const div = document.createElement("div");
      div.id = `file_${link.id}`;
      div.style.paddingLeft = "30px";
      div.style.cursor = "grab";
      div.className = "child";
      div.innerHTML = html;

      li.dataset.lid = String(link.id);
      li.appendChild(div);
      fragment.appendChild(li);
    });

    listElement.replaceChildren(fragment);

    this.registerLinkEvents();
    this.linksLoaded = true;
    uiHandler.indicateFinish();

    this.$children.stop(true, true).show();
    this.$icon.removeClass('glyphicon-folder-close').addClass('glyphicon-folder-open');
  }

  getLinkIcon(status) {
    switch (status) {
      case 0:
        return 'glyphicon glyphicon-ok';
      case 2:
      case 3:
      case 5:
        return 'glyphicon glyphicon-time';
      case 9:
      case 1:
        return 'glyphicon glyphicon-ban-circle';
      case 8:
        return 'glyphicon glyphicon-exclamation-sign';
      case 4:
        return 'glyphicon glyphicon-arrow-right';
      case 11:
      case 13:
        return 'glyphicon glyphicon-cog';
      default:
        return 'glyphicon glyphicon-cloud-download';
    }
  }

  registerLinkEvents() {
    if (this.linkEventsBound) {
      return;
    }
    this.linkEventsBound = true;

    this.$ele.on("click", ".children ul li .child_secrow [data-action]", (e) => {
      const action = e.currentTarget.dataset.action;
      const lidValue = e.currentTarget.closest("li")?.dataset.lid;
      if (!lidValue) {
        return;
      }
      const lid = [lidValue];

      if (action === "delete-link") {
        this.deleteLink(lid);
      } else if (action === "restart-link") {
        this.restartLink(lid);
      }
    });

    this.$childrenList.sortable({
      handle: ".child",
      axis: "y",
      cursor: "grabbing",
      start(e, ui) {
        $(this).attr('data-previndex', ui.item.index());
      },
      stop(event, ui) {
        const newIndex = ui.item.index();
        const oldIndex = $(this).attr('data-previndex');
        $(this).removeAttr('data-previndex');
        if (newIndex === oldIndex) {
          return false;
        }
        uiHandler.indicateLoad();
        $.get({
          url: "{{url_for('json.link_order')}}",
          data: { fid: ui.item.data('lid'), pos: newIndex },
          traditional: true,
          success: () => {
            uiHandler.indicateFinish();
            return true;
          }
        }).fail(() => {
          uiHandler.indicateFail();
          return false;
        });
      }
    });
  }

  deleteLink(lid) {
    uiHandler.yesNoDialog("{{_('Are you sure you want to delete this link?')}}", (answer) => {
      if (answer) {
        uiHandler.indicateLoad();
        $.post(`{{url_for('api.rpc', func='delete_files')}}/[${lid}]`)
          .done(() => {
            const fileElement = document.getElementById(`file_${lid}`);
            const listItem = fileElement?.parentElement;
            if (listItem) {
              listItem.remove();
            } else if (fileElement) {
              fileElement.remove();
            }
            uiHandler.indicateFinish();
          })
          .fail(() => {
            uiHandler.indicateFail();
          });
      }
    });
  }

  restartLink(lid) {
    $.post(`{{url_for('api.rpc', func='restart_file')}}/${lid}`)
      .done(() => {
        const $file = $(`#file_${lid}`);
        const $icon = $file.find(".glyphicon").first();
        const $status = $file.find(".child_status").eq(1);

        if ($icon.length) {
          $icon.attr("class", "glyphicon glyphicon-time text-info");
        }
        if ($status.length) {
          $status.text("{{_('queued')}}");
        }

        uiHandler.indicateSuccess();
      })
      .fail(() => {
        uiHandler.indicateFail();
      });
  }

  toggle() {
    if (this.$children.css('display') === "block") {
      this.$children.stop(true, true).hide();
      this.$icon.removeClass('glyphicon-folder-open').addClass('glyphicon-folder-close');
    } else {
      if (!this.linksLoaded) {
        this.loadLinks();
      } else {
        this.$children.stop(true, true).show();
      }
      this.$icon.removeClass('glyphicon-folder-close').addClass('glyphicon-folder-open');
    }
  }

  deletePackage(event) {
    event.stopPropagation();
    event.preventDefault();
    uiHandler.yesNoDialog("{{_('Are you sure you want to delete this package?')}}", (answer) => {
      if (answer) {
        uiHandler.indicateLoad();
        $.post(`{{url_for('api.rpc', func='delete_packages')}}/[${this.id}]`)
          .done(() => {
            this.ui.removePackage(this);
            $(this.ele).remove();
            uiHandler.indicateFinish();
          })
          .fail(() => {
            uiHandler.indicateFail();
          });
      }
    });
  }

  restartPackage(event) {
    event.stopPropagation();
    event.preventDefault();
    uiHandler.indicateLoad();
    $.post(`{{url_for('api.rpc', func='restart_package')}}/${this.id}`)
      .done(() => {
        this.close();
        uiHandler.indicateSuccess();
      })
      .fail(() => {
        uiHandler.indicateFail();
      });
  }

  extractPackage(event) {
    event.stopPropagation();
    event.preventDefault();
    uiHandler.indicateLoad();
    $.post(`{{url_for('api.rpc', func='service_call')}}/'ExtractArchive.extract_package', [${this.id}]`)
      .done(() => {
        this.close();
        uiHandler.indicateSuccess();
      })
      .fail(() => {
        uiHandler.indicateFail();
      });
  }

  close() {
    if (this.$children.css('display') === "block") {
      this.$children.stop(true, true).hide();
      this.$icon.removeClass('glyphicon-folder-open').addClass('glyphicon-folder-close');
    }
    if (this.childrenListElement) {
      this.childrenListElement.replaceChildren();
    }
    this.linksLoading = false;
    this.linksLoaded = false;
  }

  movePackage(event) {
    event.stopPropagation();
    event.preventDefault();
    uiHandler.indicateLoad();
    $.get({
      url: "{{url_for('json.move_package')}}",
      data: { id: this.id, dest: ((this.ui.type + 1) % 2) },
      traditional: true
    })
      .done(() => {
        this.ui.removePackage(this);
        $(this.ele).remove();
        uiHandler.indicateFinish();
      })
      .fail(() => {
        uiHandler.indicateFail();
      });
  }

  editOrder(event) {
    event.stopPropagation();
    event.preventDefault();
    uiHandler.indicateLoad();
    $.get({
      url: "{{url_for('json.package')}}",
      data: {id: this.id},
      traditional: true
    })
      .done((data) => {
        const length = data.links.length;
        for (let i = 1; i <= length / 2; i++) {
          $.get({
            url: "{{url_for('json.link_order')}}",
            data: { fid: data.links[length - i].fid, pos: i - 1 },
            traditional: true
          }).fail(() => {
            uiHandler.indicateFail();
          });
        }
        uiHandler.indicateFinish();
        this.close();
      })
      .fail(() => {
        uiHandler.indicateFail();
      });
  }

  editPackage(event) {
    event.stopPropagation();
    event.preventDefault();
    $("#pack_form").off("submit").submit((e) => this.savePackage(e));

    $("#pack_id").val(this.id[0]);
    $("#pack_name").val(this.name.text());
    $("#pack_folder").val(this.folder.text());
    $("#pack_pws").val(this.password.text());
    $('#pack_box').modal('show');
  }

  savePackage(event) {
    $.ajax({
      url: "{{url_for('json.edit_package')}}",
      type: 'post',
      dataType: 'json',
      data: $('#pack_form').serialize()
    });
    event.preventDefault();
    this.name.text($("#pack_name").val());
    this.folder.text($("#pack_folder").val());
    this.password.text($("#pack_pws").val());
    $('#pack_box').modal('hide');
  }
}

{% endautoescape %}
