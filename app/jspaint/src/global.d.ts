

interface JQuery<T = any> {
    [key: string]: any;
}
declare namespace JQuery {
    type DragOverEvent = any;
    type DragEnterEvent = any;
    type TriggeredEvent = any;
    type MouseUpEvent = any;
    type MouseDownEvent = any;
    type MouseMoveEvent = any;
    type ClickEvent = any;
    type ChangeEvent = any;
    type KeyDownEvent = any;
    type KeyUpEvent = any;
    type KeyPressEvent = any;
}

interface Window {
    jQuery: any;
    $: any;
    showSaveFilePicker: any;
    showOpenFilePicker: any;
    FileSystemHandle: any;
    is_electron_app: boolean;
    debugKeepMenusOpen: boolean;
    _open_images_serially: boolean;
    clipboardData: any;
    initial_system_file_handle: any;
    untrusted_gesture: boolean;
    systemHooks: any;
    systemHookDefaults: any;
    canvas_bounding_client_rect: any;
    $app: any;
    $canvas_area: any;
    $canvas: any;
    canvas_handles: any;
    $top: any;
    $bottom: any;
    $left: any;
    $right: any;
    $status_area: any;
    $status_text: any;
    $status_position: any;
    $status_size: any;
    menu_bar: any;
    $toolbox: any;
    $colorbox: any;
    api_for_cypress_tests: any;
    update_fill_and_stroke_colors_and_lineWidth: any;
    tool_go: any;
    setMenus: any;
}
