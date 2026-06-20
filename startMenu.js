// startMenu.js
// 이 파일은 Windows XP 시작 메뉴를 생성하고 관리하는 모듈입니다.

// appLauncher dependency removed
import { APPS } from './appRegistry.js';

class StartMenu {
  constructor() {
    // 시작 메뉴가 열려 있는지 여부를 추적하는 속성
    this.isOpen = false;
    this.isOpen = false;
    this.openSubmenus = []; // 현재 열려있는 하위 메뉴의 계층을 추적
    this.launcher = null; // App launcher function injected by appengine

    // 시작 메뉴 요소를 생성합니다.
    this.createStartMenu();

    // 이벤트 리스너를 등록합니다.
    this.addEventListeners();
  }

  // 시작 메뉴 HTML 요소를 생성하는 메서드
  createStartMenu() {
    // 시작 메뉴 컨테이너 생성
    this.startMenuEl = document.createElement('div');
    this.startMenuEl.className = 'start-menu';
    this.startMenuEl.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 0;
      width: 386px;
      height: 520px;
      background-color: #4282d6;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      box-shadow: 1px 0px 3px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      z-index: 1000;
      display: none;
      font-family: Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
    `;

    // 시작 메뉴 HTML 내용
    this.startMenuEl.innerHTML = `
      <!-- 헤더 영역 -->
      <header class="start-menu-header" style="
        position: relative;
        align-self: flex-start;
        display: flex;
        align-items: center;
        color: #fff;
        height: 40px;
        padding: 7px 4px 6px;
        width: 376px;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        background: linear-gradient(
            to bottom,
            #1868ce 0%,
            #0e60cb 12%,
            #0e60cb 20%,
            #1164cf 32%,
            #1667cf 33%,
            #1b6cd3 47%,
            #1e70d9 54%,
            #2476dc 60%,
            #297ae0 65%,
            #3482e3 77%,
            #3786e5 79%,
            #428ee9 90%,
            #4791eb 100%
        );
        overflow: hidden;
      ">
        <div style="
          content: '';
          display: block;
          position: absolute;
          top: 1px;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(
              to right,
              transparent 0,
              rgba(255, 255, 255, 0.3) 1%,
              rgba(255, 255, 255, 0.5) 2%,
              rgba(255, 255, 255, 0.5) 95%,
              rgba(255, 255, 255, 0.3) 98%,
              rgba(255, 255, 255, 0.2) 99%,
              transparent 100%
          );
          box-shadow: inset 0 -1px 1px #0e60cb;
        "></div>
        <img class="header-img" src="./image/usericon1.png" alt="avatar" style="
          width: 38px;
          height: 38px;
          margin-right: 5px;
          border-radius: 3px;
          border: 2px solid rgba(222, 222, 222, 0.8);
        ">
        <span class="header-text" style="
          font-size: 14px;
          font-weight: 700;
          text-shadow: 1px 1px rgba(0, 0, 0, 0.7);
        ">User</span>
      </header>
      
      <!-- 메뉴 내용 -->
      <section class="start-menu-content" style="
        display: flex;
        margin: 0 2px;
        position: relative;
        border-top: 1px solid #385de7;
        box-shadow: 0 1px #385de7;
        flex: 1;
      ">
        <hr class="orange-hr" style="
          position: absolute;
          left: 0;
          right: 0;
          top: -6px;
          display: block;
          height: 3px;
          background: linear-gradient(
              to right,
              rgba(0, 0, 0, 0) 0%,
              #da884a 50%,
              rgba(0, 0, 0, 0) 100%
          );
          border: 0;
        ">
        <!-- 왼쪽 메뉴 -->
        <div class="menu-left" style="
          background-color: #fff;
          padding: 6px 5px 0;
          width: 180px;
          display: flex;
          flex-direction: column;
        ">
          <div class="menu-item" id="internet-item" data-app-id="internet-explorer" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 34px;
          ">
            <img class="menu-item-img" src="./image/earth.png" alt="Internet" style="
              margin-right: 3px;
              width: 30px;
              height: 30px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text menu-item-bold" style="
                font-weight: 700;
              ">Internet</div>
              <div class="menu-item-subtext" style="
                color: rgba(0, 0, 0, 0.4);
                line-height: 12px;
                margin-bottom: 1px;
              ">Internet Explorer</div>
            </div>
          </div>
          <div class="menu-item" id="email-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 34px;
          ">
            <img class="menu-item-img" src="./image/messenger.png" alt="E-mail" style="
              margin-right: 3px;
              width: 30px;
              height: 30px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text menu-item-bold" style="
                font-weight: 700;
              ">E-mail</div>
              <div class="menu-item-subtext" style="
                color: rgba(0, 0, 0, 0.4);
                line-height: 12px;
                margin-bottom: 1px;
              ">Outlook Express</div>
            </div>
          </div>
          <div class="menu-separator" style="
            height: 2px;
            background: linear-gradient(
                to right,
                rgba(0, 0, 0, 0) 0%,
                rgba(0, 0, 0, 0.1) 50%,
                rgba(0, 0, 0, 0) 100%
            );
            border-top: 3px solid transparent;
            border-bottom: 3px solid transparent;
            background-clip: content-box;
          "></div>
          <div class="menu-item" data-app-id="minesweeper" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 34px;
          ">
            <img class="menu-item-img" src="./image/minesweeper.png" alt="Minesweeper" style="
              margin-right: 3px;
              width: 30px;
              height: 30px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Minesweeper</div>
            </div>
          </div>
          <div class="menu-item" data-app-id="msnotepad" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 34px;
          ">
            <img class="menu-item-img" src="./image/msnotepad.png" alt="Notepad" style="
              margin-right: 3px;
              width: 30px;
              height: 30px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Notepad</div>
            </div>
          </div>
          <div class="menu-item" data-app-id="icon-webamp" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 34px;
          ">
            <img class="menu-item-img" src="./image/mediaplayer.png" alt="Winamp" style="
              margin-right: 3px;
              width: 30px;
              height: 30px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Winamp</div>
            </div>
          </div>
          <div class="menu-item" data-app-id="wmplayer" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 34px;
          ">
            <img class="menu-item-img" src="./image/mediaplayer.png" alt="Windows Media Player" style="
              margin-right: 3px;
              width: 30px;
              height: 30px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Windows Media Player</div>
            </div>
          </div>

          <div class="menu-item" data-app-id="msnmsgr" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 34px;
          ">
            <img class="menu-item-img" src="./image/messenger.png" alt="Windows Messenger" style="
              margin-right: 3px;
              width: 30px;
              height: 30px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Windows Messenger</div>
            </div>
          </div>
          <div style="flex: 1;"></div>
          <div class="menu-separator" style="
            height: 2px;
            background: linear-gradient(
                to right,
                rgba(0, 0, 0, 0) 0%,
                rgba(0, 0, 0, 0.1) 50%,
                rgba(0, 0, 0, 0) 100%
            );
            border-top: 3px solid transparent;
            border-bottom: 3px solid transparent;
            background-clip: content-box;
          "></div>
          <div class="menu-item" id="all-programs-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 34px;
          ">
            <!-- All Programs 항목: 글자 진하게 및 가운데 정렬 -->
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
            <div class="menu-item-text menu-item-bold" style="
              font-weight: 700;  
              text-align: center; 
              padding-left: 40px;
            ">AllPrograms</div>
            </div>
            <img class="menu-item-img" src="./image/allprogram.png" alt="All Programs" style="
              margin-left: 5px; 
              height: 18px; 
              width: 18px;
              margin-right: 3px;
            ">
            <div class="menu-arrow" style="
              border: 3.5px solid transparent;
              border-right: 0;
              border-left-color: #00136b;
              position: absolute;
              right: 5px;
              top: 50%;
              transform: translateY(-50%);
            "></div>
            <!-- 하위 메뉴 -->
            <div class="submenu" id="all-programs-submenu" style="
              position: absolute;
              left: 100%;
              top: auto;
              bottom: 0;
              width: 200px;
              background-color: #fff;
              border: none;
              box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgba(0, 0, 0, 0.5);
              padding-left: 1px;
              z-index: 1000;
              display: none;
            ">
              <!-- Set Program Access and Defaults 항목 -->
              <div class="submenu-item" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/tourxp.png" alt="Set Program Access and Defaults" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Set Program Access and Defaults</div>
              </div>
              
              <!-- Windows Catalog 항목 -->
              <div class="submenu-item" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/docfolder.png" alt="Windows Catalog" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Windows Catalog</div>
              </div>
              
              <!-- Windows Update 항목 -->
              <div class="submenu-item" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/windowsearch.png" alt="Windows Update" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Windows Update</div>
              </div>
              
              <div class="menu-separator" style="
                box-shadow: inset 3px 0 #4081ff;
                height: 2px;
                background: linear-gradient(
                    to right,
                    rgba(0, 0, 0, 0) 0%,
                    rgba(0, 0, 0, 0.1) 50%,
                    rgba(0, 0, 0, 0) 100%
                );
                padding: 3px 0;
                background-clip: content-box;
                border: none;
                margin: 0;
              "></div>
              
              <!-- Accessories 폴더 -->
              <div class="submenu-folder" id="accessories-folder" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                position: relative;
              ">
                <img class="submenu-item-img" src="./image/start menu programs.png" alt="Accessories" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Accessories</div>
                <div class="menu-arrow" style="
                  border: 3.5px solid transparent;
                  border-right: 0;
                  border-left-color: #00136b;
                  position: absolute;
                  right: 5px;
                  top: 50%;
                  transform: translateY(-50%);
                "></div>
                
                <!-- Accessories 하위 메뉴 -->
                <div class="submenu" id="accessories-submenu" style="
                  position: absolute;
                  left: 100%;
                  top: auto;
                  bottom: 0;
                  width: 200px;
                  background-color: #fff;
                  border: none;
              box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgba(0, 0, 0, 0.5);
              padding-left: 1px;
                  z-index: 1001;
                  display: none;
                ">
                  <!-- Accessibility 폴더 -->
                  <div class="submenu-folder" id="accessibility-folder" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                    position: relative;
                  ">
                    <img class="submenu-item-img" src="./image/start menu programs.png" alt="Accessibility" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Accessibility</div>
                    <div class="menu-arrow" style="
                      border: 3.5px solid transparent;
                      border-right: 0;
                      border-left-color: #00136b;
                      position: absolute;
                      right: 5px;
                      top: 50%;
                      transform: translateY(-50%);
                    "></div>
                    
                    <!-- Accessibility 하위 메뉴 -->
                    <div class="submenu" id="accessibility-submenu" style="
                      position: absolute;
                      left: 100%;
                      top: auto;
                      bottom: 0;
                      width: 200px;
                      background-color: #fff;
                      border: none;
              box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgba(0, 0, 0, 0.5);
              padding-left: 1px;
                      z-index: 1002;
                      display: none;
                    ">
                      <!-- Accessibility Wizard 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/accessibility wizard.png" alt="Accessibility Wizard" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Accessibility Wizard</div>
                      </div>
                      

                      
                      <!-- Magnifier 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/magnifier.png" alt="Magnifier" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Magnifier</div>
                      </div>
                      
                      <!-- Narrator 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/narrator.png" alt="Narrator" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Narrator</div>
                      </div>
                      
                      <!-- On-Screen Keyboard 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/on-screen keyboard.png" alt="On-Screen Keyboard" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">On-Screen Keyboard</div>
                      </div>
                      
                      <!-- Utility Manager 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/task manager.png" alt="Utility Manager" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Utility Manager</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Communications 폴더 -->
                  <div class="submenu-folder" id="communications-folder" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                    position: relative;
                  ">
                    <img class="submenu-item-img" src="./image/start menu programs.png" alt="Communications" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Communications</div>
                    <div class="menu-arrow" style="
                      border: 3.5px solid transparent;
                      border-right: 0;
                      border-left-color: #00136b;
                      position: absolute;
                      right: 5px;
                      top: 50%;
                      transform: translateY(-50%);
                    "></div>
                    
                    <!-- Communications 하위 메뉴 -->
                    <div class="submenu" id="communications-submenu" style="
                      position: absolute;
                      left: 100%;
                      top: auto;
                      bottom: 0;
                      width: 200px;
                      background-color: #fff;
                      border: none;
              box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgba(0, 0, 0, 0.5);
              padding-left: 1px;
                      z-index: 1002;
                      display: none;
                    ">
                      <!-- Address Book 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/docfolder.png" alt="Address Book" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Address Book</div>
                      </div>
                      
                      <!-- HyperTerminal 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/hyper terminal.png" alt="HyperTerminal" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">HyperTerminal</div>
                      </div>
                      
                      <!-- Internet Explorer 항목 -->
                      <div class="submenu-item" data-app-id="internet-explorer" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/explore.png" alt="Internet Explorer" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Internet Explorer</div>
                      </div>
                      
                      <!-- Outlook Express 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/outlook.png" alt="Outlook" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Outlook Express</div>
                      </div>
                      
                      <!-- Windows Messenger 항목 -->
                      <div class="submenu-item" data-app-id="msnmsgr" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/messenger.png" alt="Windows Messenger" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Windows Messenger</div>
                      </div>
                      
                      <!-- Remote Desktop Connection 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/remote desktop.png" alt="Remote Desktop Connection" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Remote Desktop Connection</div>
                      </div>
                      
                      <!-- Phone and Modem Options 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/shell32.png" alt="Phone and Modem Options" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Phone and Modem Options</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Entertainment 폴더 -->
                  <div class="submenu-folder" id="entertainment-folder" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                    position: relative;
                  ">
                    <img class="submenu-item-img" src="./image/start menu programs.png" alt="Entertainment" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Entertainment</div>
                    <div class="menu-arrow" style="
                      border: 3.5px solid transparent;
                      border-right: 0;
                      border-left-color: #00136b;
                      position: absolute;
                      right: 5px;
                      top: 50%;
                      transform: translateY(-50%);
                    "></div>
                    
                    <!-- Entertainment 하위 메뉴 -->
                    <div class="submenu" id="entertainment-submenu" style="
                      position: absolute;
                      left: 100%;
                      top: auto;
                      bottom: 0;
                      width: 200px;
                      background-color: #fff;
                      border: none;
              box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgba(0, 0, 0, 0.5);
              padding-left: 1px;
                      z-index: 1002;
                      display: none;
                    ">
                      <!-- Windows Media Player 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/mediaplayer.png" alt="Windows Media Player" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Windows Media Player</div>
                      </div>
                      
                      <!-- Windows Movie Maker 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/windows movie maker.png" alt="Windows Movie Maker" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Windows Movie Maker</div>
                      </div>
                      
                      <!-- Volume Control 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/volumelevel.png" alt="Volume Control" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Volume Control</div>
                      </div>
                      
                      <!-- Sound Recorder 항목 -->
                      <div class="submenu-item" data-app-id="recorder" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/volume.png" alt="Sound Recorder" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Sound Recorder</div>
                      </div>
                      

                    </div>
                  </div>
                  
                  <!-- System Tools 폴더 -->
                  <div class="submenu-folder" id="system-tools-folder" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                    position: relative;
                  ">
                    <img class="submenu-item-img" src="./image/start menu programs.png" alt="System Tools" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">System Tools</div>
                    <div class="menu-arrow" style="
                      border: 3.5px solid transparent;
                      border-right: 0;
                      border-left-color: #00136b;
                      position: absolute;
                      right: 5px;
                      top: 50%;
                      transform: translateY(-50%);
                    "></div>
                    
                    <!-- System Tools 하위 메뉴 -->
                    <div class="submenu" id="system-tools-submenu" style="
                      position: absolute;
                      left: 100%;
                      top: auto;
                      bottom: 0;
                      width: 200px;
                      background-color: #fff;
                      border: none;
              box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgba(0, 0, 0, 0.5);
              padding-left: 1px;
                      z-index: 1002;
                      display: none;
                    ">
                      <!-- Backup 항목 -->
                      <div class="submenu-item" data-app-id="ntbackup" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/backup wizard.png" alt="Backup" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Backup</div>
                      </div>
                      
                      <!-- Disk Cleanup 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/drive.png" alt="Disk Cleanup" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Disk Cleanup</div>
                      </div>
                      
                      <!-- Disk Defragmenter 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/drive.png" alt="Disk Defragmenter" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Disk Defragmenter</div>
                      </div>
                      
                      <!-- Event Viewer 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/system information.png" alt="Event Viewer" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Event Viewer</div>
                      </div>
                      
                      <!-- Internet Connection Sharing 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/network.png" alt="Internet Connection Sharing" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Internet Connection Sharing</div>
                      </div>
                      
                      <!-- System Information 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/system information.png" alt="System Information" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">System Information</div>
                      </div>
                      
                      <!-- System Restore 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/restore.png" alt="System Restore" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">System Restore</div>
                      </div>
                      
                      <!-- Task Manager 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/task manager.png" alt="Task Manager" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Task Manager</div>
                      </div>
                      
                      <!-- Windows Update 항목 -->
                      <div class="submenu-item" style="
                        padding: 1px;
                        display: flex;
                        align-items: center;
                        height: 24px;
                        margin-bottom: 0px;
                        color: #000;
                        border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                      ">
                        <img class="submenu-item-img" src="./image/windowsearch.png" alt="Windows Update" style="
                          width: 16px;
                          height: 16px;
                          margin-left: 4px;
                          margin-right: 10px;
                        ">
                        <div class="menu-item-text">Windows Update</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Address Book 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/docfolder.png" alt="Address Book" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Address Book</div>
                  </div>
                  
                  <!-- Command Prompt 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/cmd.png" alt="Command Prompt" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Command Prompt</div>
                  </div>
                  
                  <!-- Notepad 항목 -->
                  <div class="submenu-item" data-app-id="msnotepad" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/msnotepad.png" alt="Notepad" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Notepad</div>
                  </div>
                  
                  <!-- Paint 항목 -->
                  <div class="submenu-item" data-app-id="mspaint" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/paint.png" alt="Paint" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Paint</div>
                  </div>
                  
                  <!-- Calculator 항목 -->
                  <div class="submenu-item" data-app-id="calculator" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/calculator.png" alt="Calculator" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Calculator</div>
                  </div>
                  
                  <!-- Program Compatibility Wizard 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/protect.png" alt="Program Compatibility Wizard" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Program Compatibility Wizard</div>
                  </div>
                  
                  <!-- Remote Desktop Connection 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/remote desktop.png" alt="Remote Desktop Connection" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Remote Desktop Connection</div>
                  </div>
                  
                  <!-- Synchronize 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/network.png" alt="Synchronize" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Synchronize</div>
                  </div>
                  
                  <!-- Tour Windows XP 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/tourxp.png" alt="Tour Windows XP" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Tour Windows XP</div>
                  </div>
                  
                  <!-- Windows Explorer 항목 -->
                  <div class="submenu-item" data-app-id="icon-my-computer" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/explore.png" alt="Windows Explorer" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Windows Explorer</div>
                  </div>
                  
                  <!-- WordPad 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/wordpad.png" alt="WordPad" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">WordPad</div>
                  </div>
                </div>
              </div>
              
              <!-- Games 폴더 -->
              <div class="submenu-folder" id="games-folder" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                position: relative;
              ">
                <img class="submenu-item-img" src="./image/start menu programs.png" alt="Games" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Games</div>
                <div class="menu-arrow" style="
                  border: 3.5px solid transparent;
                  border-right: 0;
                  border-left-color: #00136b;
                  position: absolute;
                  right: 5px;
                  top: 50%;
                  transform: translateY(-50%);
                "></div>
                
                <!-- Games 하위 메뉴 -->
                <div class="submenu" id="games-submenu" style="
                  position: absolute;
                  left: 100%;
                  top: auto;
                  bottom: 0;
                  width: 200px;
                  background-color: #fff;
                  border: none;
              box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgba(0, 0, 0, 0.5);
              padding-left: 1px;
                  z-index: 1001;
                  display: none;
                ">
                  <!-- FreeCell 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/freecell.png" alt="FreeCell" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">FreeCell</div>
                  </div>
                  
                  <!-- Hearts 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/hearts.png" alt="Hearts" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Hearts</div>
                  </div>
                  
                  <!-- Internet Backgammon 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/backgammon.png" alt="Internet Backgammon" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Internet Backgammon</div>
                  </div>
                  
                  <!-- Internet Checkers 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/checker.png" alt="Internet Checkers" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Internet Checkers</div>
                  </div>
                  
                  <!-- Internet Hearts 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/hearts.png" alt="Internet Hearts" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Internet Hearts</div>
                  </div>
                  
                  <!-- Internet Reversi 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/reversi.png" alt="Internet Reversi" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Internet Reversi</div>
                  </div>
                  
                  <!-- Internet Spades 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/spades.png" alt="Internet Spades" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Internet Spades</div>
                  </div>
                  
                  <!-- Minesweeper 항목 -->
                  <div class="submenu-item" data-app-id="minesweeper" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/minesweeper.png" alt="Minesweeper" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Minesweeper</div>
                  </div>
                  
                  <!-- Pinball 항목 -->
                  <div class="submenu-item" data-app-id="pinball" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/pinball.png" alt="Pinball" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Pinball</div>
                  </div>
                  
                  <!-- Solitaire 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/solitaire.png" alt="Solitaire" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Solitaire</div>
                  </div>
                  
                  <!-- Spider Solitaire 항목 -->
                  <div class="submenu-item" data-app-id="spider" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                  ">
                    <img class="submenu-item-img" src="./image/spider.png" alt="Spider Solitaire" style="
                      width: 16px;
                      height: 16px;
                      margin-left: 4px;
                      margin-right: 10px;
                    ">
                    <div class="menu-item-text">Spider Solitaire</div>
                  </div>
                </div>
              </div>
              
              <!-- Startup 폴더 -->
              <div class="submenu-folder" id="startup-folder" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                position: relative;
              ">
                <img class="submenu-item-img" src="./image/start menu programs.png" alt="Startup" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Startup</div>
                <div class="menu-arrow" style="
                  border: 3.5px solid transparent;
                  border-right: 0;
                  border-left-color: #00136b;
                  position: absolute;
                  right: 5px;
                  top: 50%;
                  transform: translateY(-50%);
                "></div>
                
                <!-- Startup 하위 메뉴 -->
                <div class="submenu" id="startup-submenu" style="
                  position: absolute;
                  left: 100%;
                  top: auto;
                  bottom: 0;
                  width: 200px;
                  background-color: #fff;
                  border: none;
              box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgba(0, 0, 0, 0.5);
              padding-left: 1px;
                  z-index: 1001;
                  display: none;
                ">
                  <!-- (Empty) 항목 -->
                  <div class="submenu-item" style="
                    padding: 1px;
                    display: flex;
                    align-items: center;
                    height: 24px;
                    margin-bottom: 0px;
                    color: #000;
                    border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
                    justify-content: center; /* 텍스트를 가운데 정렬 */
                  ">
                    <!-- 아이콘 없음 -->
                    <div class="menu-item-text">(Empty)</div>
                  </div>
                </div>
              </div>
              
              <!-- Internet Explorer 항목 -->
              <div class="submenu-item" data-app-id="internet-explorer" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/explore.png" alt="Internet Explorer" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Internet Explorer</div>
              </div>
              
              <!-- Outlook Express 항목 -->
              <div class="submenu-item" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/outlook.png" alt="Outlook Express" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Outlook Express</div>
              </div>
              
              <!-- Remote Assistance 항목 -->
              <div class="submenu-item" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/messenger.png" alt="Remote Assistance" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Remote Assistance</div>
              </div>
              
              <!-- Windows Media Player 항목 -->
              <div class="submenu-item" data-app-id="wmplayer" id="program-wmp" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/mediaplayer.png" alt="Windows Media Player" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Windows Media Player</div>
              </div>
              
              <!-- Windows Messenger 항목 -->
              <div class="submenu-item" data-app-id="msnmsgr" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/messenger.png" alt="Windows Messenger" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Windows Messenger</div>
              </div>
              
              <!-- Windows Movie Maker 항목 -->
              <div class="submenu-item" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/windows movie maker.png" alt="Windows Movie Maker" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Windows Movie Maker</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 오른쪽 메뉴 -->
        <div class="menu-right" style="
          background-color: #cbe3ff;
          border-left: solid rgba(58, 58, 255, 0.37) 1px;
          padding: 6px 5px 5px;
          width: 180px;
          color: #00136b;
        ">
          <!-- My Documents 항목 -->
          <div class="menu-item" id="documents-item" data-app-id="documents" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/docfolder.png" alt="My Documents" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">My Documents</div>
            </div>
          </div>
          <!-- My Computer 항목 -->
          <div class="menu-item" data-app-id="icon-my-computer" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/mycomputer.png" alt="My Computer" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">My Computer</div>
            </div>
          </div>
          <div class="menu-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/photofolder.png" alt="My Pictures" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">My Pictures</div>
            </div>
          </div>
          <div class="menu-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/musicfolder.png" alt="My Music" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">My Music</div>
            </div>
          </div>
          <div class="menu-item" data-app-id="icon-my-computer" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/mycomputer.png" alt="My Computer" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">My Computer</div>
            </div>
          </div>
          <div class="menu-separator" style="
            height: 2px;
            background: linear-gradient(
                to right,
                rgba(0, 0, 0, 0) 0%,
                rgba(135, 179, 226, 0.71) 50%,
                rgba(0, 0, 0, 0) 100%
            );
            background-clip: content-box;
          "></div>
          <div class="menu-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/panel.png" alt="Control Panel" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Control Panel</div>
            </div>
          </div>
          <div class="menu-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/tourxp.png" alt="Set Program Access and Defaults" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Set Program Access and Defaults</div>
            </div>
          </div>
          <div class="menu-item" id="connect-to-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/network.png" alt="Connect To" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Connect To</div>
            </div>
            <div class="menu-arrow" style="
              border: 3.5px solid transparent;
              border-right: 0;
              border-left-color: #00136b;
              position: absolute;
              right: 5px;
              top: 50%;
              transform: translateY(-50%);
            "></div>
            <!-- 하위 메뉴 -->
            <div class="submenu" id="connect-to-submenu" style="
              position: absolute;
              left: 100%;
              top: auto;
              bottom: 0;
              width: 200px;
              background-color: #fff;
              border: none;
              box-shadow: inset 0 0 0 1px #72ade9, 2px 3px 3px rgba(0, 0, 0, 0.5);
              padding-left: 1px;
              z-index: 1000;
              display: none;
            ">
              <div class="submenu-item" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/msn.png" alt="MSN" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">MSN</div>
              </div>
              <div class="submenu-item" style="
                padding: 1px;
                display: flex;
                align-items: center;
                height: 24px;
                margin-bottom: 0px;
                color: #000;
                border-left: 0;
                box-shadow: inset 3px 0 #4081ff;
                padding-left: 4px;
              ">
                <img class="submenu-item-img" src="./image/remoteaccessservice.png" alt="Show all connections" style="
                  width: 16px;
                  height: 16px;
                  margin-left: 4px;
                  margin-right: 10px;
                ">
                <div class="menu-item-text">Show all connections</div>
              </div>
            </div>
          </div>
          <div class="menu-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/printer.png" alt="Printers and Faxes" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Printers and Faxes</div>
            </div>
          </div>
          <div class="menu-separator" style="
            height: 2px;
            background: linear-gradient(
                to right,
                rgba(0, 0, 0, 0) 0%,
                rgba(135, 179, 226, 0.71) 50%,
                rgba(0, 0, 0, 0) 100%
            );
            background-clip: content-box;
          "></div>
          <div class="menu-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/help.png" alt="Help and Support" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Help and Support</div>
            </div>
          </div>
          <div class="menu-item" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/search.png" alt="Search" style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Search</div>
            </div>
          </div>
          <div class="menu-item" data-app-id="run" style="
            padding: 1px;
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            position: relative;
            height: 26px;
            line-height: 13px;
          ">
            <img class="menu-item-img" src="./image/execute.png" alt="Run..." style="
              margin-right: 3px;
              width: 22px;
              height: 22px;
            ">
            <div class="menu-item-texts" style="
              display: flex;
              flex-direction: column;
              justify-content: center;
              height: 100%;
              position: relative;
            ">
              <div class="menu-item-text">Run...</div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 푸터 영역 -->
      <footer class="start-menu-footer" style="
        display: flex;
        align-self: flex-end;
        align-items: center;
        justify-content: flex-end;
        color: #fff;
        height: 38px;
        width: 100%;
        background: linear-gradient(
            to bottom,
            #4282d6 0%,
            #3b85e0 3%,
            #418ae3 5%,
            #418ae3 17%,
            #3c87e2 21%,
            #3786e4 26%,
            #3482e3 29%,
            #2e7ee1 39%,
            #2374df 49%,
            #2072db 57%,
            #196edb 62%,
            #176bd8 72%,
            #1468d5 75%,
            #1165d2 83%,
            #0f61cb 88%
        );
      ">
        <!-- Log Off 및 Turn Off Computer 버튼에 호버 및 클릭 효과 추가 -->
        <!-- 호버 시 이미지 밝아짐, 클릭 시 어두워짐 효과를 위해 filter 속성 사용 -->
        <div class="footer-item" style="
          padding: 3px;
          display: flex;
          margin-right: 10px;
          align-items: center;
          height: 30px;
        " onmouseenter="this.style.backgroundColor='rgba(60, 80, 210, 0.5)'; this.querySelector('.footer-item-img').style.filter='brightness(1.05)'" onmouseleave="this.style.backgroundColor=''; this.querySelector('.footer-item-img').style.filter=''\" onmousedown="this.style.transform='translate(1px, 1px)'; this.querySelector('.footer-item-img').style.filter='brightness(0.85)'" onmouseup="this.style.transform=''; this.querySelector('.footer-item-img').style.filter='brightness(1.05)'">
          <img class="footer-item-img" src="./image/logoff.png" alt="Log Off" style="
            border-radius: 3px;
            margin-right: 2px;
            width: 22px;
            height: 22px;
          ">
          <span>Log Off</span>
        </div>
        <div class="footer-item" style="
          padding: 3px;
          display: flex;
          margin-right: 10px;
          align-items: center;
          height: 30px;
        " onmouseenter="this.style.backgroundColor='rgba(60, 80, 210, 0.5)'; this.querySelector('.footer-item-img').style.filter='brightness(1.05)'" onmouseleave="this.style.backgroundColor=''; this.querySelector('.footer-item-img').style.filter=''\" onmousedown="this.style.transform='translate(1px, 1px)'; this.querySelector('.footer-item-img').style.filter='brightness(0.85)'" onmouseup="this.style.transform=''; this.querySelector('.footer-item-img').style.filter='brightness(1.05)'">
          <img class="footer-item-img" src="./image/turnoff.png" alt="Turn Off Computer" style="
            border-radius: 3px;
            margin-right: 2px;
            width: 22px;
            height: 22px;
          ">
          <span>Turn Off Computer</span>
        </div>
      </footer>
    `;

    // 시작 메뉴를 body에 추가
    document.body.appendChild(this.startMenuEl);
  }

  // 이벤트 리스너를 등록하는 메서드
  addEventListeners() {
    // --- 1. 메뉴 아이템 호버 효과 (이벤트 위임 방식) ---
    const style = document.createElement('style');
    style.innerHTML = `
      .menu-item.hover, .submenu-item.hover, .submenu-folder.hover { 
        color: white; 
        background-color: #2f71cd; 
      }
      .menu-item.hover .menu-item-subtext { color: white; }
      .menu-item.hover .menu-arrow, .submenu-folder.hover .menu-arrow { 
        border-left-color: #fff; 
      }
    `;
    this.startMenuEl.appendChild(style);

    let currentHoveredItem = null;

    this.startMenuEl.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.menu-item, .submenu-item, .submenu-folder');

      // 마우스가 새로운 메뉴 아이템 위에 있을 경우
      if (target && target !== currentHoveredItem) {
        if (currentHoveredItem) {
          currentHoveredItem.classList.remove('hover');
        }
        target.classList.add('hover');
        currentHoveredItem = target;
      }

    });

    this.startMenuEl.addEventListener('mouseout', (e) => {
      // 마우스가 startMenuEl 전체 영역을 벗어났을 경우
      if (!this.startMenuEl.contains(e.relatedTarget)) {
        if (currentHoveredItem) {
          currentHoveredItem.classList.remove('hover');
          currentHoveredItem = null;
        }
      }
    });

    // --- 2. 하위 메뉴 열기/닫기 로직 (뷰포트 경계 확인 기능 추가) ---
    this.startMenuEl.addEventListener('mouseenter', (e) => {
      const item = e.target.closest('.menu-item, .submenu-item, .submenu-folder');
      if (!item) return;

      // 1. 현재 아이템의 레벨(깊이)을 정확하게 계산
      let level = 0;
      let parent = item.closest('.submenu');
      while (parent) {
        level++;
        parent = parent.parentElement.closest('.submenu');
      }

      // 2. 현재 레벨보다 깊은 하위 메뉴들을 모두 닫음
      while (this.openSubmenus.length > level) {
        const menuToClose = this.openSubmenus.pop();
        if (menuToClose) {
          menuToClose.style.display = 'none';
          // 스타일 초기화
          menuToClose.style.top = 'auto';
          menuToClose.style.bottom = '0';
        }
      }

      // 3. 현재 아이템이 하위 메뉴(트리거)를 가지고 있다면 열기
      const submenu = item.querySelector('.submenu');
      if (submenu) {
        // 현재 레벨에 이미 다른 (형제) 메뉴가 열려있다면 닫는다.
        if (this.openSubmenus.length > level) {
          const siblingMenuToClose = this.openSubmenus.pop();
          if (siblingMenuToClose) {
            siblingMenuToClose.style.display = 'none';
          }
        }

        // 위치 계산을 위해 먼저 보이게 설정하되, 화면에서는 숨김
        submenu.style.visibility = 'hidden';
        submenu.style.display = 'block';

        // 위치 조정 전 기본값으로 리셋
        submenu.style.top = 'auto';
        submenu.style.bottom = '0';

        // 뷰포트 경계 확인 및 위치 조정
        const rect = submenu.getBoundingClientRect();
        if (rect.top < 0) {
          // 메뉴가 화면 위로 벗어나면, 상단에 고정
          submenu.style.top = '0';
          submenu.style.bottom = 'auto';
        } else if (rect.bottom > window.innerHeight) {
          // 메뉴가 화면 아래로 벗어나면, 하단에 고정
          submenu.style.bottom = '0';
          submenu.style.top = 'auto';
        }

        // 최종적으로 메뉴를 화면에 표시
        submenu.style.visibility = 'visible';

        this.openSubmenus.push(submenu);
      }
    }, true); // Use capture phase to ensure this runs reliably

    // --- 3. 로그오프 및 종료 버튼 이벤트 ---
    const logOffButton = this.startMenuEl.querySelector('img[alt="Log Off"]');
    if (logOffButton) {
      logOffButton.parentElement.addEventListener('click', () => {
        this.close();
        import('./app/logon/shutdownPrompt.js').then(shutdownPromptModule => {
          const shutdownPrompt = shutdownPromptModule.default;
          // 옵션 선택 콜백 설정
          shutdownPrompt.setOnOptionSelect(async (option) => {
            // 선택 시 프롬프트 닫기
            shutdownPrompt.hide();

            if (option === 'logoff' || option === 'switchuser') {
              // 순환 의존성 방지를 위해 동적 임포트 권장, 혹은 상단 import 사용
              // 여기서는 간단히 동적 임포트 사용
              const logonManagerModule = await import('./app/logon/logonManager.js');
              logonManagerModule.default.showLogonScreen();
            }
          });
          shutdownPrompt.showLogoff();
        });
      });
    }

    const turnOffButton = this.startMenuEl.querySelector('img[alt="Turn Off Computer"]');
    if (turnOffButton) {
      turnOffButton.parentElement.addEventListener('click', () => {
        this.close();
        import('./app/logon/shutdownPrompt.js').then(shutdownPromptModule => {
          const shutdownPrompt = shutdownPromptModule.default;
          shutdownPrompt.setOnOptionSelect(async (option) => {
            // 선택 시 프롬프트 닫기
            shutdownPrompt.hide();

            if (option === 'restart') {
              window.location.reload();
            } else if (option === 'shutdown') {
              // 종료 로직: logonManager를 사용해 로그오프 화면 표시 (오버레이 방식)
              import('./app/logon/logonManager.js').then(logonManagerModule => {
                logonManagerModule.default.showLogoffScreen();
              });
            }
          });
          shutdownPrompt.show();
        });
      });
    }

    // --- 4. 통합 앱 실행 이벤트 (Event Delegation) ---
    this.startMenuEl.addEventListener('click', (e) => {
      // data-app-id 속성을 가진 요소를 찾아 실행
      const appItem = e.target.closest('[data-app-id]');
      if (!appItem) return;

      const appId = appItem.getAttribute('data-app-id');

      // APPS 레지스트리에 존재하는지 확인
      if (APPS[appId]) {
        this.close();
        if (this.launcher) {
          this.launcher({ id: appId });
        } else {
          console.error("Launcher not initialized");
        }
      }
    });
  }

  setLauncher(launcherFunc) {
    this.launcher = launcherFunc;
  }

  // 시작 메뉴를 토글하는 메서드
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  // 시작 메뉴를 여는 메서드
  open() {
    this.startMenuEl.style.display = 'flex';
    this.isOpen = true;
  }

  // 시작 메뉴를 닫는 메서드
  close() {
    // 모든 열려있는 하위 메뉴를 닫고 스택을 비움
    while (this.openSubmenus.length > 0) {
      const menuToClose = this.openSubmenus.pop();
      if (menuToClose) {
        menuToClose.style.display = 'none';
      }
    }

    this.startMenuEl.style.display = 'none';
    this.isOpen = false;
  }
}

// StartMenu 인스턴스 생성 및 내보내기
const startMenu = new StartMenu();
export default startMenu;