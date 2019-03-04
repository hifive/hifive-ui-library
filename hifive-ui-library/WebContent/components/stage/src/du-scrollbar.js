(function() {
	'use strict';

	var classManager = h5.cls.manager;

	var UpdateReasons = h5.ui.components.stage.UpdateReasons;
	var UpdateReasonSet = classManager.getClass('h5.ui.components.stage.UpdateReasonSet');
	var RenderPriority = h5.ui.components.stage.RenderPriority;

	var DisplayUnit = classManager.getClass('h5.ui.components.stage.DisplayUnit');

	var VerticalScrollBarController = h5.ui.components.stage.VerticalScrollBarController;

	//TODO この定数はpublicにするか、別の方法で通知可能にすべき。個々のカスタムなDU作成者が意識すべきではない
	var REASON_INTERNAL_UNSCALED_LAYOUT_UPDATE = '__i_LayerScaledUpdate__';


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
				_controller: null,
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
				},

				__renderDOM: function(stageView) {
					var $root = $('<div class="vertical"></div>');
					var rootElement = $root[0];

					rootElement.style.position = 'absolute';
					rootElement.style.cursor = 'default';

					var reason = UpdateReasonSet.create(UpdateReasons.INITIAL_RENDER);

					//TODO __updateDOMのINITIAL_RENDER呼出はStage側で行うようにする。
					//これに伴い、__renderDOM -> __createDOM に改名したほうが意味が通りやすくなる。
					//(SVG/DIVレイヤーの種類に応じて要素を変えたり、<table>など別のタグを出力したい場合もここをオーバーライドする)
					this.__updateDOM(stageView, rootElement, reason);

					var controller = h5.core.controller(rootElement, VerticalScrollBarController);

					this._viewControllerMap.set(stageView, controller);

					var that = this;
					controller.readyPromise.done(function() {
						that._setDirty([UpdateReasons.POSITION_CHANGE, UpdateReasons.SIZE_CHANGE,
								UpdateReasons.GLOBAL_POSITION_CHANGE]);

						controller.setDisplayMode(SCROLL_BAR_DISPLAY_MODE_ALWAYS);

						//						this.setBarSize(rightmostView.height);
						//						that._updateScrollBarLogicalValues();
					});

					//this._controller.setDisplayMode(SCROLL_BAR_DISPLAY_MODE_ALWAYS);

					return rootElement;
				},

				__updateDOM: function(stageView, element, reason) {
					super_.__updateDOM.call(this, stageView, element, reason);

					var controller = this._viewControllerMap.get(stageView);

					if (!controller) {
						return;
					}

					if (reason.isInitialRender || reason.isSizeChanged
							|| reason.has(REASON_INTERNAL_UNSCALED_LAYOUT_UPDATE)) {
						controller.setBarSize($(element).height());
						this._updateScrollBarLogicalValues(controller);
					}
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