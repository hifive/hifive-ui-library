(function() {
	'use strict';

	var classManager = h5.cls.manager;

	var UpdateReasons = h5.ui.components.stage.UpdateReasons;
	var UpdateReasonSet = classManager.getClass('h5.ui.components.stage.UpdateReasonSet');
	var RenderPriority = h5.ui.components.stage.RenderPriority;

	var DisplayUnit = classManager.getClass('h5.ui.components.stage.DisplayUnit');

	var VerticalScrollBarController = h5.ui.components.stage.VerticalScrollBarController;


	/**
	 * @class DUScrollBar
	 * @param super_ スーパークラス様オブジェクト
	 * @returns クラス定義
	 */
	DisplayUnit.extend(function(super_) {

		var SCROLL_BAR_DISPLAY_MODE_ALWAYS = 3;

		var desc = {
			name: 'h5.ui.components.stage.DUScrollBar',

			field: {
				_viewControllerMap: null
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.DUScrollBar
				 */
				constructor: function DUScrollBar(id) {
					super_.constructor.call(this, id);
					//TODO controllerのbind/unbindに対応して、Alwaysでなくてもよいようにする
					this.renderPriority = RenderPriority.ALWAYS;
					this._viewControllerMap = new Map();
					this.isDraggable = false;
				},

				__renderDOM: function(stageView, reason) {
					var $root = $('<div class="vertical"></div>');
					var rootElement = $root[0];

					rootElement.style.position = 'absolute';
					rootElement.style.cursor = 'default';

					var controller = h5.core.controller(rootElement, VerticalScrollBarController);

					var dfd = null;
					if (reason.isSnapshot) {
						//このDeferredが使われるのはスナップショット取得の場合のみ
						dfd = h5.async.deferred();
					}

					//TODO __updateDOMのINITIAL_RENDER呼出はStage側で行うようにする。
					//これに伴い、__renderDOM -> __createDOM に改名したほうが意味が通りやすくなる。
					//(SVG/DIVレイヤーの種類に応じて要素を変えたり、<table>など別のタグを出力したい場合もここをオーバーライドする)
					//初回描画でルート要素のサイズをDUのサイズに合わせる
					this.__updateDOM(stageView, rootElement, reason);

					var that = this;
					controller.readyPromise.done(function() {
						if (!reason.isSnapshot) {
							//通常の画面描画
							that._viewControllerMap.set(stageView, controller);
							controller.setDisplayMode(SCROLL_BAR_DISPLAY_MODE_ALWAYS);

							that
									._setDirty([UpdateReasons.POSITION_CHANGE,
											UpdateReasons.SIZE_CHANGE,
											UpdateReasons.GLOBAL_POSITION_CHANGE]);
						} else {
							//スナップショット取得時
							//スクロールバーをコントローラに描画させ、すぐにコントローラを破棄する
							that._updateScrollBar(rootElement, controller);
							controller.dispose();

							dfd.resolve(rootElement);
						}
					});

					if (reason.isSnapshot) {
						return dfd.promise();
					}
					//Snapshot以外の場合は要素を直接返す
					return rootElement;
				},

				__updateDOM: function(stageView, element, reason) {
					super_.__updateDOM.call(this, stageView, element, reason);

					var controller = this._viewControllerMap.get(stageView);

					if (!controller) {
						return;
					}

					if (reason.isInitialRender || reason.isSizeChanged
							|| reason.isUnscaledSizeChanged) {
						this._updateScrollBar(element, controller);
					}
				},

				_updateScrollBar: function(element, controller) {
					controller.setBarSize($(element).height());
					this._updateScrollBarLogicalValues(controller);
				},

				_updateScrollBarLogicalValues: function(controller) {
					if (!controller) {
						return;
					}

					var scrollWorldAmount = 100; //this.getVisibleHeight() - worldHeight;
					var worldY = 10; //reprView._viewport.worldY;

					controller.setScrollSize(this.height, scrollWorldAmount);
					controller.setScrollPosition(worldY);
				}
			}
		};
		return desc;
	});


})();