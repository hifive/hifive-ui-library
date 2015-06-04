//--------------------------------------------------------
// 定数定義
//--------------------------------------------------------
(function() {
	//----------------------------------------
	// コマンドマネージャが上げるイベント
	//----------------------------------------
	/** undo実行完了時に上がるイベント名 */
	var EVENT_UNDO = 'undo';

	/** redo実行完了時に上がるイベント名 */
	var EVENT_REDO = 'redo';

	/** undoができるようになった時に上がるイベント名 */
	var EVENT_ENABLE_UNDO = 'enableUndo';

	/** redoができるようになった時に上がるイベント名 */
	var EVENT_ENABLE_REDO = 'enableRedo';

	/** undoができなくなった時に上がるイベント名 */
	var EVENT_DISABLE_UNDO = 'disableUndo';

	/** redoが出来なくなったときに上がるイベント名 */
	var EVENT_DISABLE_REDO = 'disableRedo';

	/** 描画操作を開始した時に上がるイベント名 */
	var EVENT_DRAWSTART = 'drawStart';

	/** 描画操作を終了した時に上がるイベント名 */
	var EVENT_DRAWEND = 'drawEnd';

	/** コマンドによる図形追加時に生成されるイベント名 */
	var EVENT_APPEND_SHAPE = 'appendShape';

	/** コマンドによる図形削除時に生成されるイベント名 */
	var EVENT_REMOVE_SHAPE = 'removeShape';

	/** コマンドによる図形編集(スタイル、属性)時に生成されるイベント名 */
	var EVENT_EDIT_SHAPE = 'editShape';

	/** 背景変更時に生成されるイベント名 */
	var EVENT_EDIT_BACKGROUND = 'editBackground';

	//----------------------------------------
	// 定数
	//----------------------------------------
	/** imageSourceMapと対応付けるために要素に持たせるデータ属性名 */
	var DATA_IMAGE_SOURCE_ID = 'h5-artboard-image-id';

	/** 要素に、要素の位置とサイズを持たせるときのデータ属性名 */
	var DATA_BOUNDS_OBJECT = 'bounds-object';

	/**
	 * SVGの名前空間
	 */
	var XLINKNS = 'http://www.w3.org/1999/xlink';
	var XMLNS = 'http://www.w3.org/2000/svg';

	// メッセージ
	/** ドキュメントツリー上にない要素で作成したRemoveCommandを実行した時のエラーメッセージ */
	var ERR_MSG_CANNOT_REMOVE_NOT_APPENDED = 'removeはレイヤに追加されている要素のみ実行できます';
	/** 終了したドラッグセッションが使用された時のエラーメッセージ */
	var ERR_MSG_ArtAGSESSION_DISABLED = '終了したDragSessionのメソッドは呼べません';

	h5.u.obj.expose('h5.ui.components.artboard', {
		consts: {
			EVENT_UNDO: EVENT_UNDO,
			EVENT_REDO: EVENT_REDO,
			EVENT_ENABLE_UNDO: EVENT_ENABLE_UNDO,
			EVENT_ENABLE_REDO: EVENT_ENABLE_REDO,
			EVENT_DISABLE_UNDO: EVENT_DISABLE_UNDO,
			EVENT_DISABLE_REDO: EVENT_DISABLE_REDO,
			EVENT_DRAWSTART: EVENT_DRAWSTART,
			EVENT_DRAWEND: EVENT_DRAWEND,
			EVENT_APPEND_SHAPE: EVENT_APPEND_SHAPE,
			EVENT_REMOVE_SHAPE: EVENT_REMOVE_SHAPE,
			EVENT_EDIT_SHAPE: EVENT_EDIT_SHAPE,
			EVENT_EDIT_BACKGROUND: EVENT_EDIT_BACKGROUND,
			XMLNS: XMLNS,
			XLINKNS: XLINKNS,
			DATA_IMAGE_SOURCE_ID: DATA_IMAGE_SOURCE_ID,
			DATA_BOUNDS_OBJECT: DATA_BOUNDS_OBJECT
		},
		message: {
			ERR_MSG_CANNOT_REMOVE_NOT_APPENDED: ERR_MSG_CANNOT_REMOVE_NOT_APPENDED,
			ERR_MSG_ArtAGSESSION_DISABLED: ERR_MSG_ArtAGSESSION_DISABLED
		}
	});
})();