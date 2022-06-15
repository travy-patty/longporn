// Set vars
w96.ui.Theme.uiVars.maxWindowSizeFormulaW = "calc(100vw - -2px)";
w96.ui.Theme.uiVars.maxWindowSizeFormulaH = "calc(100vh - 44px)";

// Add start menubar
let username = 'User';
let sam = await w96.sys.sam.readSAM();
if(sam && sam.name) username = sam.name;

const startMenuItems = [
    {
        name: username,
        action: ()=>void w96.sys.execCmd("explorer", ["c:/user"])
    },
    {
        name: "Documents",
        action: ()=>void w96.sys.execCmd("explorer", ["c:/user/documents"])
    },
    {
        name: "App Data",
        action: ()=>void w96.sys.execCmd("explorer", ["c:/user/appdata"])
    },
    {
        name: "Trash",
        action: ()=>void w96.sys.execCmd("explorer", ["c:/trash"])
    },
    {
        type: "separator"
    },
    {
        name: "Computer",
        action: ()=>void w96.sys.execCmd("explorer", [])
    },
    {
        name: "Root",
        action: ()=>void w96.sys.execCmd("explorer", ["w:/"])
    },
    {
        type: "separator"
    },
    {
        name: "Run",
        action: ()=>void w96.sys.execCmd("run", [])
    },
    {
        name: "Control Panel",
        action: ()=>void w96.sys.execCmd("ctrl", [])
    },
    {
        name: "Help",
        action: ()=>void w96.sys.execCmd("wiki96", [])
    },
    {
        name: "Reboot",
        action: ()=>void w96.sys.execCmd("reboot", [])
    }
];

const quickProgramsMenuItems = [
    {
        name: "Explorer",
        icon: await w96.ui.Theme.getIconUrl("apps/explorer"),
        action: ()=>void w96.sys.execCmd("explorer", [])
    },
    {
        name: "Package Manager",
        icon: await w96.ui.Theme.getIconUrl("apps/pkmgr"),
        action: ()=>void w96.sys.execCmd("pkmgr", [])
    },
    {
        name: "Textpad",
        icon: await w96.ui.Theme.getIconUrl("apps/textpad"),
        action: ()=>void w96.sys.execCmd("textpad", [])
    }
];

let currentView = "quick";

function createListItem(label, icon, action) {
    const btn = document.createElement('div');
    btn.classList.add('item');

    btn.addEventListener('click', async (e)=>{
        let evtObj = {
            evt: e,
            cancel: false
        };

        await action(evtObj);

        if(!evtObj.cancel) {
            console.log("aero debug: close start");
            w96.evt.shell.emit('start-close');
        }
    });

    const iconEl = document.createElement('div');
    iconEl.className = "icon";
    iconEl.style.backgroundImage = `url(${icon})`;
    btn.appendChild(iconEl);

    const textEl = document.createElement('div');
    textEl.className = "text";
    textEl.innerText = label;
    btn.appendChild(textEl);

    return btn;
}

async function populateP1View(start, type, args) {
    currentView = type;
    const p1items = start.querySelector(".p1>.items");

    while(p1items.firstChild)
        p1items.removeChild(p1items.firstChild);

    //p1items.querySelectorAll("*").forEach((v)=>v.remove());

    if(type == "quick") {
        for(let i of quickProgramsMenuItems) {
            if(i.type == "separator") {
                const s = document.createElement('div');
                s.classList.add('separator');
                p1items.appendChild(s);
            } else {
                p1items.appendChild(createListItem(i.name, i.icon, i.action));
            }
        }
    } else if(type == "programs") {
        const diskContents = await w96.FS.readdir((args == null) ? "c:/system/programs" : args);
        const cleanNames = diskContents.map((v)=>w96.FSUtil.fname(v));
        if(args && (args != "c:/system/programs") && (args !== "C:/system/programs")) {
            let upEl = createListItem("..", await w96.ui.Theme.getIconUrl("places/folder", "16x16"), async (e)=>{
                e.cancel = true;
                populateP1View(start, "programs", w96.FSUtil.getParentPath(args));
                e.evt.stopPropagation();
            });

            upEl.classList.add('small');
            p1items.appendChild(upEl);
        }

        cleanNames.aForEach(async(n, i)=>{
            let el = createListItem(n, await w96.ui.Theme.getFileIconUrl(diskContents[i], "16x16"), async (e)=>{
                if(await w96.FS.isFile(diskContents[i])) {
                    w96.sys.execFile(diskContents[i]);
                } else {
                    e.evt.stopPropagation();
                    e.cancel = true;

                    // Open and close directory.
                    populateP1View(start, "programs", diskContents[i]);
                }
            });

            el.classList.add('small');
            p1items.appendChild(el);
        });
    }
}

let fnStartOpen = async (e)=>{
    e.remove();
    // Replace start menu
    const start = document.createElement('div');
    start.className = "start-menu oc-event-exempt";

    start.innerHTML = `
        <div class="account">
            <div class="account-pfp"></div>
            <span>User</span>
        </div>
        <div class="huge-ahh-line"></div>
        <div class="container">
            <div class="p1">
                <div class="items"></div>
                <div class="all-programs">
                    <hr>
                    <div class="button">
                       All Programs <div class="start_arrow_button"></div>
                    </div>
                </div>
                <div class="search-box">
                    <input class="w96-textbox search" placeholder="Search programs and files">
                </div>
            </div>
            <div class="p2">
                <div class="items"></div>
            </div>
        </div>
    `;

    const p2account = start.querySelector('.account');
    if(sam && sam.picture && await w96.FS.exists(sam.picture.path)) {
        let url = URL.createObjectURL(new Blob([await w96.FS.readbin(sam.picture.path)], { type: sam.picture.mime }));
        p2account.style.backgroundImage = 'url(' + url + ')';
        p2account.style.backgroundSize = 'cover';
        //URL.revokeObjectURL(url);
    }

    // Setup search box
    const searchBox = start.querySelector('.search');
    const p1items = start.querySelector(".p1>.items");
    const allProgramsBtn = start.querySelector(".all-programs>.button");

    const prgmBackHandler = async () => {
        await populateP1View(start, "quick");
        searchBox.value = "";
        allProgramsBtn.onclick = prgmAllHandler;
    };

    const prgmAllHandler = async () => {
        await populateP1View(start, "programs");
        allProgramsBtn.onclick = prgmBackHandler;
        searchBox.value = "";
    };

    allProgramsBtn.onclick = prgmAllHandler;

    searchBox.addEventListener('keydown', async(v)=>{
        try {
            if((searchBox.value.trim() == "") && (currentView !== "quick")) {
                // Revert to quick view
                await populateP1View(start, "quick");
                allProgramsBtn.textContent = "▶ All Programs";

                // All programs event handler.
                allProgramsBtn.onclick = prgmAllHandler;
            } else {
                if(searchBox.value.length < 2)
                    return;

                allProgramsBtn.textContent = "◀ Back";
                allProgramsBtn.onclick = prgmBackHandler;
                // TODO Add events to programs button to go back.

                // Show search results
                await populateP1View(start, "search");

                const diskContents = await w96.FS.walk("c:/");
                const cleanNames = diskContents.map((v)=>w96.FSUtil.fname(v));

                const lq = searchBox.value.trim().toLowerCase();

                let firstIndex = 0;

                await cleanNames.aForEach(async(n, i)=>{
                    const nLq = n.trim().toLowerCase();

                    if(nLq.includes(lq)) {
                        let el = createListItem(n, await w96.ui.Theme.getFileIconUrl(diskContents[i], "small"), ()=>{
                            w96.sys.execFile(diskContents[i]);
                        });
                        if (!firstIndex)firstIndex = i;

                        el.classList.add('small');

                        p1items.appendChild(el);
                    }
                });

                if(v.keyCode == 13){
                    fnStartClose();
                    w96.sys.execFile(diskContents[firstIndex]);
                }
            }
        } catch(e) {
            console.error(e);
        }
    });

    await populateP1View(start, "quick");

    const p2items = start.querySelector(".p2>.items");

    for(let i of startMenuItems) {
        if(i.type == "separator") {
            const s = document.createElement('div');
            s.classList.add('separator');
            p2items.appendChild(s);
        } else {
            const btn = document.createElement('button');
            btn.addEventListener('click', ()=>{
                w96.evt.shell.emit('start-close');
                i.action();
            });
            btn.innerText = i.name;
            p2items.appendChild(btn);
        }
    }

    document.querySelector('#maingfx').appendChild(start);
    searchBox.focus();
};

w96.evt.shell.on('start-opened', fnStartOpen);

let fnStartClose = ()=>{
    const s = document.querySelector('.start-menu');

    if(s) {
        while(s.firstChild)
            s.removeChild(s.firstChild);

        s.remove();
    }
};

w96.evt.shell.on('start-closed', fnStartClose);

w96.evt.ui.once('theme-unload', ()=>{
    w96.evt.shell.remove('start-opened', fnStartOpen);
    w96.evt.shell.remove('start-closed', fnStartClose);
});