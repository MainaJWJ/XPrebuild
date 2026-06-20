// appRegistry.js
// 이 파일은 모든 애플리케이션의 설정과 데이터를 중앙에서 관리합니다.
// ID, 표시 이름, 아이콘, 실행 옵션, 데스크톱 위치 등을 정의합니다.

/**
 * 앱 정의 및 설정 레지스트리
 * 구조:
 * {
 *   [appId]: {
 *     id: string,          // 고유 식별자
 *     title: string,       // 표시 이름
 *     iconUrl: string,     // 아이콘 경로
 *     launchOptions: {     // 앱 실행 옵션 (windowManager/appLauncher용)
 *       iframeSrc?: string,
 *       width?: number,
 *       height?: number,
 *       resizable?: boolean,
 *       fullscreen?: boolean,
 *       ...
 *     },
 *     desktopColumn: number // 데스크톱 아이콘 열 위치 (1, 2, 3, 4)
 *   }
 * }
 */
export const APPS = {
    // === OS Core Configuration ===
    'display-properties': {
        id: 'display-properties',
        title: 'Display properties',
        iconUrl: './image/setup.png',
        launchOptions: {
            title: 'Display properties',
            iframeSrc: './app/properties/displayProperties.html',
            width: 410,
            height: 480,
            resizable: false,
            iconUrl: './image/setup.png'
        }
    },
    // === Column 1 ===
    'icon-my-computer': {
        id: 'icon-my-computer',
        title: 'My Computer',
        iconUrl: './image/mycomputer.png',
        launchOptions: {
            title: 'My Computer',
            iframeSrc: './app/folder.html',
            width: 790,
            height: 520,
            iconUrl: './image/mycomputer.png'
        },
        desktopColumn: 1
    },
    'timedate': {
        id: 'timedate',
        title: 'Date and Time',
        iconUrl: './image/timedate.png',
        launchOptions: {
            title: 'Date and Time Properties',
            iframeSrc: './app/clock.html',
            width: 415,
            height: 340,
            resizable: false,
            iconUrl: './image/timedate.png'
        }
    },
    'documents': {
        id: 'documents',
        title: 'My Documents',
        iconUrl: './image/docfolder.png',
        launchOptions: {
            title: 'My Documents',
            iframeSrc: './app/documents.html',
            width: 800,
            height: 600,
            iconUrl: './image/docfolder.png'
        },
        desktopColumn: 1
    },
    'bin': {
        id: 'bin',
        title: 'Bin',
        iconUrl: './image/bin.png',
        launchOptions: {
            title: 'Bin',
            iframeSrc: './app/bin.html',
            width: 790,
            height: 520,
            iconUrl: './image/bin.png'
        },
        desktopColumn: 1
    },
    'internet-explorer': {
        id: 'internet-explorer',
        title: 'Internet Explorer',
        iconUrl: './image/explore.png',
        launchOptions: {
            title: 'Internet Explorer',
            iframeSrc: './app/internet-explorer.html',
            width: 800,
            height: 600,
            iconUrl: './image/explore.png'
        },
        desktopColumn: 1
    },
    'github-xprebuild': {
        id: 'github-xprebuild',
        title: 'GitHub - xprebuild',
        iconUrl: './image/windowslogo.png',
        launchOptions: {
            title: 'GitHub - xprebuild',
            iframeSrc: './app/github-ie.html',
            width: 800,
            height: 600,
            iconUrl: './image/windowslogo.png'
        },
        desktopColumn: 4
    },
    'msnotepad': {
        id: 'msnotepad',
        title: 'notepad',
        iconUrl: './image/msnotepad.png',
        launchOptions: {
            title: 'Microsoft notepad',
            iframeSrc: './app/msnotepad.html',
            width: 900,
            height: 760,
            iconUrl: './image/msnotepad.png'
        },
        desktopColumn: 1
    },
    'calculator': {
        id: 'calculator',
        title: 'Calculator',
        iconUrl: './image/calculator.png',
        launchOptions: {
            title: 'Calculator',
            iframeSrc: './app/calculator.html',
            width: 295,
            height: 251,
            resizable: false,
            iconUrl: './image/calculator.png'
        },
        desktopColumn: 1
    },
    'mspaint': {
        id: 'mspaint',
        title: 'paint',
        iconUrl: './image/mspaint.png',
        launchOptions: {
            title: 'mspaint',
            iframeSrc: './app/jspaint/index.html',
            width: 770,
            height: 530,
            iconUrl: './image/mspaint.png'
        },
        desktopColumn: 1
    },
    'cmd': {
        id: 'cmd',
        title: 'Command Prompt',
        iconUrl: './image/cmd.png',
        launchOptions: {
            title: 'C:\\WINDOWS\\system32\\cmd.exe',
            iframeSrc: './app/cmd.html',
            width: 660,
            height: 400,
            resizable: true,
            iconUrl: './image/cmd.png'
        },
        desktopColumn: 4
    },
    'recorder': {
        id: 'recorder',
        title: 'Recorder',
        iconUrl: './image/volume.png',
        launchOptions: {
            title: 'Recorder',
            iframeSrc: './app/recorder.html',
            width: 310,
            height: 170,
            resizable: false,
            iconUrl: './image/volume.png'
        },
        desktopColumn: 2
    },
    'flight': {
        id: 'flight',
        title: 'flight',
        iconUrl: './image/earth.gif',
        launchOptions: {
            title: 'Flight',
            iframeSrc: './app/flight/index.html',
            width: 800,
            height: 600,
            iconUrl: './image/earth.gif'
        },
        desktopColumn: 2
    },
    'minecraft-web': {
        id: 'minecraft-web',
        title: 'Minecraft',
        iconUrl: './image/minecraft.png',
        launchOptions: {
            title: 'Minecraft Web',
            iframeSrc: './app/minecraft web/index.html',
            width: 800,
            height: 600,
            iconUrl: './image/minecraft.png'
        },
        desktopColumn: 2
    },
    'pinball': {
        id: 'pinball',
        title: 'Pinball',
        iconUrl: './image/pinball.png',
        launchOptions: {
            title: 'Pinball',
            iframeSrc: './app/pinball/space-cadet.html',
            width: 600,
            height: 460,
            resizable: false,
            iconUrl: './image/pinball.png'
        },
        desktopColumn: 2
    },
    'vscode': {
        id: 'vscode',
        title: 'VS Code',
        iconUrl: './image/vscode.png',
        launchOptions: {
            title: 'VS Code',
            iframeSrc: './app/vscode/index.html',
            width: 800,
            height: 600,
            iconUrl: './image/vscode.png'
        },
        desktopColumn: 2
    },
    'spider': {
        id: 'spider',
        title: 'Spider Solitaire',
        iconUrl: './image/spider.png',
        launchOptions: {
            title: 'Spider Solitaire',
            iframeSrc: './app/spider/index.html',
            width: 880,
            height: 600,
            resizable: false,
            iconUrl: './image/spider.png'
        },
        desktopColumn: 2
    },
    'msnmsgr': {
        id: 'msnmsgr',
        title: 'Windows Messenger',
        iconUrl: './app/msnmsgr/messenger.png',
        launchOptions: {
            title: 'Windows Messenger',
            iframeSrc: './app/msnmsgr/index.html',
            width: 270,
            height: 500,
            resizable: false,
            iconUrl: './app/msnmsgr/messenger.png'
        },
        desktopColumn: 2
    },

    // === Column 3 ===

    'minesweeper': {
        id: 'minesweeper',
        title: 'Mine sweeper',
        iconUrl: './image/minesweeper.png',
        launchOptions: {
            title: 'Mine sweeper',
            iframeSrc: './app/minesweeper/index.html',
            width: 278,
            height: 346,
            resizable: false,
            iconUrl: './image/minesweeper.png'
        },
        desktopColumn: 3
    },

    'msword': {
        id: 'msword',
        title: 'Microsoft Word',
        iconUrl: './image/doc.png',
        launchOptions: {
            title: 'Microsoft Word',
            iframeSrc: './app/wordpad/index.html',
            width: 800,
            height: 600,
            iconUrl: './image/doc.png'
        },
        desktopColumn: 3
    },
    'excel': {
        id: 'excel',
        title: 'Microsoft Excel',
        iconUrl: './image/xls.png',
        launchOptions: {
            title: 'Microsoft Excel',
            iframeSrc: './app/excel/index.html',
            width: 800,
            height: 600,
            iconUrl: './image/xls.png'
        },
        desktopColumn: 3
    },
    'powerpoint': {
        id: 'powerpoint',
        title: 'Microsoft PowerPoint',
        iconUrl: './image/ppt.png',
        launchOptions: {
            title: 'Microsoft PowerPoint',
            iframeSrc: './app/powerpoint/index.html',
            width: 800,
            height: 600,
            iconUrl: './image/ppt.png'
        },
        desktopColumn: 3
    },
    'icon-webamp': {
        id: 'icon-webamp',
        title: 'Webamp',
        iconUrl: './image/webamp.png',
        launchOptions: {
            title: 'Webamp',
            iframeSrc: './app/webamp/index.html',
            width: 300,
            height: 100,
            iconUrl: './image/webamp.png'
        },
        desktopColumn: 3
    },
    'photoshop': {
        id: 'photoshop',
        title: 'photoshop',
        iconUrl: './image/photoshop.png',
        launchOptions: {
            title: 'photoshop',
            iframeSrc: './app/minipaint/index.html',
            width: 600,
            height: 500,
            iconUrl: './image/photoshop.png'
        },
        desktopColumn: 3
    },
    'wmplayer': {
        id: 'wmplayer',
        title: 'Windows Media Player',
        iconUrl: './image/mediaplayer.png',
        launchOptions: {
            title: 'Windows Media Player',
            iframeSrc: './app/wmplayer/index.html',
            width: 700,
            height: 500,
            iconUrl: './image/mediaplayer.png'
        },
        desktopColumn: 3
    },



    // === Column 4 ===
    'hwpviewer': {
        id: 'hwpviewer',
        title: 'HWP Viewer',
        iconUrl: './image/hwp.png',
        launchOptions: {
            title: 'HWP Viewer',
            iframeSrc: './app/hwpviewer/editor.html',
            width: 1000,
            height: 600,
            iconUrl: './image/hwp.png'
        },
        desktopColumn: 4
    },
    'pikachuvolleyball': {
        id: 'pikachuvolleyball',
        title: 'Pikachu Volleyball',
        iconUrl: './app/pikachuvolleyball/resources/assets/images/IDI_PIKAICON-1_gap_filled.png',
        launchOptions: {
            title: 'Pikachu Volleyball',
            iframeSrc: './app/pikachuvolleyball/index.html',
            width: 540,
            height: 480,
            resizable: false,
            iconUrl: './app/pikachuvolleyball/resources/assets/images/IDI_PIKAICON-1_gap_filled.png'
        },
        desktopColumn: 4
    },
    'imagefolder': {
        id: 'imagefolder',
        title: 'Image Viewer',
        iconUrl: './image/photofolder.png',
        launchOptions: {
            title: 'Image Viewer',
            iframeSrc: './app/imagefolder/imagefolder.html',
            width: 900,
            height: 650,
            iconUrl: './image/photofolder.png'
        },
        desktopColumn: 4
    },
    'system-properties': {
        id: 'system-properties',
        title: 'System Properties',
        iconUrl: './image/system information.png',
        launchOptions: {
            title: 'System Properties',
            iframeSrc: './app/system-properties/index.html',
            width: 425,
            height: 520,
            resizable: false,
            iconUrl: './image/system information.png'
        },
        desktopColumn: 4
    },
    'ntbackup': {
        id: 'ntbackup',
        title: 'Backup or Restore Wizard',
        iconUrl: './app/ntbackup/backup.png',
        launchOptions: {
            title: 'Backup or Restore Wizard',
            iframeSrc: './app/ntbackup/index.html',
            width: 500,
            height: 380,
            resizable: false,
            iconUrl: './app/ntbackup/backup.png'
        },
        desktopColumn: 4
    },

    'run': {
        id: 'run',
        title: 'Run',
        iconUrl: './image/execute.png',
        launchOptions: {
            title: 'Run',
            iframeSrc: './app/run.html',
            width: 350,
            height: 190,
            resizable: false,
            iconUrl: './image/execute.png'
        },
        desktopColumn: null
    },

    'pdfviewer': {
        id: 'pdfviewer',
        title: 'Adobe PDF Reader',
        iconUrl: './image/pdf.png',
        launchOptions: {
            title: 'Adobe PDF Reader',
            iframeSrc: './app/pdfviewer/index.html',
            width: 800,
            height: 600,
            iconUrl: './image/pdf.png'
        },
        desktopColumn: null // 바탕화면에 없음
    },
    'imageviewer': {
        id: 'imageviewer',
        title: 'Windows Picture Viewer',
        iconUrl: './image/paint.png',
        launchOptions: {
            title: 'Microsoft Image Viewer',
            iframeSrc: './app/imageviewer/index.html',
            width: 800,
            height: 600,
            iconUrl: './image/paint.png'
        },
        desktopColumn: null
    },

    // === Screensavers (Hidden specific apps, mainly valid for launchOptions) ===
    'flower': {
        id: 'flower',
        title: 'Flower',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Flower Screensaver',
            iframeSrc: './app/screensaver/flower/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null // 바탕화면에서 제거 (폴더에서 실행 가능)
    },
    'pipes': {
        id: 'pipes',
        title: 'Pipes',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Pipes Screensaver',
            iframeSrc: './app/screensaver/pipes/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'maze': {
        id: 'maze',
        title: 'Maze',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Maze Screensaver',
            iframeSrc: './app/screensaver/maze/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'windows': {
        id: 'windows',
        title: 'Windows Screensaver',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Windows Screensaver',
            iframeSrc: './app/screensaver/windows/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'starfield': {
        id: 'starfield',
        title: 'Starfield Screensaver',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Starfield Screensaver',
            iframeSrc: './app/screensaver/starfield/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'mystify': {
        id: 'mystify',
        title: 'Mystify Screensaver',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Mystify Screensaver',
            iframeSrc: './app/screensaver/mystify/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'smile': {
        id: 'smile',
        title: 'Smile Screensaver',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Smile Screensaver',
            iframeSrc: './app/screensaver/smile/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'fish': {
        id: 'fish',
        title: 'Fish',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Fish Screensaver',
            iframeSrc: './app/screensaver/fish/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'flying-toasters': {
        id: 'flying-toasters',
        title: 'Flying Toasters',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Flying Toasters Screensaver',
            iframeSrc: './app/screensaver/flying-toasters/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'hard-rain': {
        id: 'hard-rain',
        title: 'Hard Rain',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Hard Rain Screensaver',
            iframeSrc: './app/screensaver/hard-rain/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'rainstorm': {
        id: 'rainstorm',
        title: 'Rainstorm',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Rainstorm Screensaver',
            iframeSrc: './app/screensaver/rainstorm/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    },
    'starry-night': {
        id: 'starry-night',
        title: 'Starry Night',
        iconUrl: './image/protect.png',
        launchOptions: {
            title: 'Starry Night Screensaver',
            iframeSrc: './app/screensaver/starry-night/index.html',
            fullscreen: true,
            iconUrl: './image/protect.png'
        },
        desktopColumn: null
    }
};

/**
 * 모든 앱의 리스트를 배열로 반환
 */
export function getAllApps() {
    return Object.values(APPS);
}

/**
 * 바탕화면에 표시할 아이콘 앱 배열을 반환합니다.
 * desktopColumn 값이 있는 앱만 포함됩니다.
 * @returns {Array}
 */
export function getDesktopIcons() {
    return getAllApps().filter(app => app.desktopColumn != null);
}

/**
 * AppLauncher용 옵션 맵 반환 (기존 호환성)
 */
export function getAppLaunchOptions() {
    const options = {};
    for (const [id, app] of Object.entries(APPS)) {
        options[id] = app.launchOptions;
    }
    return options;
}

export default {
    APPS,
    getAllApps,
    getDesktopIcons,
    getAppLaunchOptions
};
