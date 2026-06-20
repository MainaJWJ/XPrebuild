/**
 * dragSelector.js
 * 드래그하여 여러 항목을 선택하는 기능을 제공하는 재사용 가능한 모듈입니다.
 */
class DragSelector {
  /**
   * @param {object} options - 선택 기능에 대한 설정 옵션
   * @param {HTMLElement} options.container - 드래그가 일어날 부모 컨테이너 요소
   * @param {string} options.selectableItems - 선택될 수 있는 항목들을 가리키는 CSS 선택자
   * @param {string} options.selectionClass - 선택된 항목에 추가될 CSS 클래스 이름
   */
  constructor({ container, selectableItems, selectionClass }) {
    if (!container || !selectableItems || !selectionClass) {
      throw new Error('DragSelector: container, selectableItems, selectionClass 옵션은 필수입니다.');
    }

    this.container = container;
    this.selectableItemsSelector = selectableItems;
    this.selectionClass = selectionClass;
    this.selectionBox = null;
    this.isDragging = false;
    this.hasDragged = false; // 드래그 여부 추적 플래그
    this.startCoords = { x: 0, y: 0 };
    this.itemRects = [];
  }

  /**
   * 드래그 선택 기능을 활성화합니다.
   * 필요한 CSS를 주입하고 이벤트 리스너를 설정합니다.
   */
  initialize() {
    this._injectCSS();
    this._cacheItemRects();

    // 이벤트 리스너 바인딩
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onClick = this._onClick.bind(this); // 클릭 핸들러 바인딩

    this.container.addEventListener('mousedown', this._onMouseDown);
    this.container.addEventListener('click', this._onClick, true); // 캡처 단계에서 클릭 이벤트 가로채기
  }

  /**
   * 드래그 선택 기능을 비활성화하고 이벤트 리스너를 제거합니다.
   */
  destroy() {
    this.container.removeEventListener('mousedown', this._onMouseDown);
    this.container.removeEventListener('click', this._onClick, true);
    // 추가적인 리스너 제거 로직이 필요할 수 있습니다.
  }

  /**
   * 선택 상자에 필요한 CSS 스타일을 동적으로 <head>에 추가합니다.
   * @private
   */
  _injectCSS() {
    const css = `
      .selection-box {
        position: fixed;
        border: 1px dotted #5A5A5A; /* 30% 더 진한 회색으로 변경 */
        background-color: transparent; /* 내부 색을 투명하게 변경 */
        z-index: 9999;
        pointer-events: none; /* 상자 아래의 이벤트를 막지 않음 */
      }
    `;
    const style = document.createElement('style');
    style.id = 'drag-selector-styles';
    style.textContent = css;

    if (!document.getElementById(style.id)) {
      document.head.appendChild(style);
    }
  }

  /**
   * 모든 선택 가능한 항목의 위치 정보를 미리 계산하여 캐싱합니다.
   * @private
   */
  _cacheItemRects() {
    this.itemRects = [];
    this.container.querySelectorAll(this.selectableItemsSelector).forEach(itemEl => {
      this.itemRects.push({
        element: itemEl,
        rect: itemEl.getBoundingClientRect()
      });
    });
  }

  /**
   * 모든 항목의 선택을 해제합니다.
   */
  clearSelection() {
    this.container.querySelectorAll(`.${this.selectionClass}`).forEach(item => {
      item.classList.remove(this.selectionClass);
    });
  }
  /**
   * @private
   */
  _onClick(e) {
    // 바탕화면 빈 공간 클릭 시 잔류 사각형 제거
    this.forceCleanup();

    // 드래그가 발생했다면 클릭 이벤트를 중단시켜 바탕화면의 선택 해제 로직이 실행되지 않도록 함
    if (this.hasDragged) {
      e.stopPropagation();
      e.stopImmediatePropagation(); // 확실하게 중단
      this.hasDragged = false; // 상태 리셋
    }
  }

  /**
   * 화면에 남아있는 모든 선택 사각형 요소를 강제로 제거합니다.
   */
  forceCleanup() {
    const boxes = document.querySelectorAll('.selection-box');
    boxes.forEach(box => box.remove());
    this.selectionBox = null;
    this.isDragging = false;
  }

  /**
   * 컨테이너에서의 mousedown 이벤트 핸들러입니다.
   * @param {MouseEvent} e
   * @private
   */
  _onMouseDown(e) {
    // 우클릭이면 무시
    if (e.button !== 0) return;

    // 새로운 드래그 시작 전 기존에 남은 사각형들 강제 정리
    this.forceCleanup();

    // 아이콘(또는 그 내부) 위에서 시작된 경우 마키 선택 시작 안함
    // (iconDragger가 캡처링 단계에서 이미 처리함)
    if (e.target.closest(this.selectableItemsSelector)) return;

    // 창(.xp-window) 위에서 시작된 경우 마키 선택 시작 안함 (창 드래그와 충돌 방지)
    if (e.target.closest('.xp-window')) return;

    // 드래그 시작 시 아이콘 위치 정보 갱신 (이동 후에도 최신 위치 반영)
    this._cacheItemRects();

    this.isDragging = true;
    this.hasDragged = false;
    this.clearSelection();

    this.selectionBox = document.createElement('div');
    this.selectionBox.className = 'selection-box';
    document.body.appendChild(this.selectionBox);

    this.startCoords = { x: e.clientX, y: e.clientY };

    this.selectionBox.style.left = `${this.startCoords.x}px`;
    this.selectionBox.style.top = `${this.startCoords.y}px`;
    this.selectionBox.style.width = '0px';
    this.selectionBox.style.height = '0px';

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
  }


  /**
   * 문서 전체에서의 mousemove 이벤트 핸들러입니다.
   * @param {MouseEvent} e
   * @private
   */
  _onMouseMove(e) {
    if (!this.isDragging) return;

    this.hasDragged = true; // 드래그 발생으로 표시

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(this.startCoords.x, currentX);
    const top = Math.min(this.startCoords.y, currentY);
    const width = Math.abs(this.startCoords.x - currentX);
    const height = Math.abs(this.startCoords.y - currentY);

    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;

    const boxRect = this.selectionBox.getBoundingClientRect();

    // 캐싱된 아이콘 위치 정보와 비교하여 선택 여부 결정
    this.itemRects.forEach(icon => {
      const isIntersecting = !(
        icon.rect.right < boxRect.left ||
        icon.rect.left > boxRect.right ||
        icon.rect.bottom < boxRect.top ||
        icon.rect.top > boxRect.bottom
      );
      icon.element.classList.toggle(this.selectionClass, isIntersecting);
    });
  }

  /**
   * 문서 전체에서의 mouseup 이벤트 핸들러입니다.
   * @private
   */
  _onMouseUp() {
    this.isDragging = false;
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
  }
}

export default DragSelector;
