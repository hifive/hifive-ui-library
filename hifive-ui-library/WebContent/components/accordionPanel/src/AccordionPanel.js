(function() {
	'use strict';

	// =========================================================================
	//
	// 定数の定義
	//
	// =========================================================================

	var DIVIDER_SIZE = 4;
	var DEFAULT_NORMAL_SIZE = 100;

	var CLASS_PANELBOX = 'panelBox';
	var CLASS_DIVIDEDBOX = 'dividedBox';

	var NORMAL_STATE = 'normal';
	var MIN_STATE = 'min';

	var NORMAL_STATE_SIZE_DATA_NAME = 'normalStateSize';

	var DATA_DIVIDED_BOX_INSTANCE = 'h5controller-dividedbox-instance';
	var DATA_STATE_BOX_INSTANCE = 'h5controller-statebox-instance';

	var DATA_STATE_BOX_SELECTOR = 'state-box-selector';
	var DATA_STATE = 'state';
	var BOX_NAME_DATA_NAME = 'box-name';
	var DATA_STATE_CHANGE_DIRECTION = 'state-change-direction';
	var DIRECTION_BACKWARD = 'backward';
	var DIRECTION_FORWARD = 'forward';

	var DIVIDED_BOXES_SELECTOR = '.dividedbox-managed:not(.divider)';

	var DATA_MIN_BOX_SIZE = 'min-size';

	// =========================================================================
	//
	// 外部モジュールのキャッシュ
	//
	// =========================================================================

	// =========================================================================
	//
	// コントローラの定義
	//
	// =========================================================================

	var accordionPanelController = {
		/**
		 * @memberOf h5.ui.container.
		 */
		__name: 'h5.ui.container.AccordionPanelController',

		__init: function() {
			// テンプレートの登録
			this.view
					.register(
							'panelBoxTemplate',
							'<div data-state="normal"><div class="boxHeader"><span class="boxName">[%= boxName %]</span><div class="btn btn-default changeStateButton" data-state="min"><span class="glyphicon glyphicon-minus"></span></div></div><div class="boxContent"></div></div><div class="[%= minimizeDir %]Bar" data-state="min"><div class="btn btn-default changeStateButton" data-state="normal"><span class="glyphicon glyphicon-plus"></span></div><div class="[%= minimizeDir %]BarName">[%= boxName %]</div></div>');

			this._bindedControllers = [];
			this._dividedBoxControllers = [];
			var promises = [];

			// StateBox のバインド
			var stateBoxDef = h5.ui.container.StateBox;
			this.$find('.' + CLASS_PANELBOX).each(this.own(function(i, elem) {
				this._setMinimizableBox(elem);
				// min-sizeが指定されていなければボックスの高さ(幅)+1px分を指定
				if ($(elem).data(DATA_MIN_BOX_SIZE) == null) {
					$(elem).data(DATA_MIN_BOX_SIZE, $(elem).find('.boxHeader').outerHeight() + 1);
				}
				var controller = h5.core.controller(elem, stateBoxDef);
				$(elem).data(DATA_STATE_BOX_INSTANCE, controller);
				this._bindedControllers.push(controller);
				promises.push(controller.readyPromise);
			}));

			// DividedBox のバインド
			var dbBoxDef = h5.ui.container.DividedBox;
			this.$find('.' + CLASS_DIVIDEDBOX).each(this.own(function(i, elem) {
				// dividedBoxが入れ子になっている場合について、子のdividedBoxでかつboxHeaderを含むdividedBoxならmin-sizeを指定する
				if ($(elem).find('.' + CLASS_DIVIDEDBOX).length) {
					$(elem).find('.' + CLASS_DIVIDEDBOX).each(function() {
						if ($(this).data(DATA_MIN_BOX_SIZE) != null) {
							return;
						}
						var $boxHeader = $(this).find('.boxHeader');
						if ($boxHeader.length) {
							$(this).data(DATA_MIN_BOX_SIZE, $boxHeader.outerHeight() + 1);
						}
					});
				}
				var controller = h5.core.controller(elem, dbBoxDef);
				$(elem).data(DATA_DIVIDED_BOX_INSTANCE, controller);
				this._bindedControllers.push(controller);
				this._dividedBoxControllers.push(controller);
				promises.push(controller.readyPromise);
			}));

			return h5.async.when(promises);
		},

		__ready: function() {
			this._isAllReady = true;

			// manageChildする
			for (var i = 0, l = this._bindedControllers.length; i < l; i++) {
				this.manageChild(this._bindedControllers[i]);
			}
			this._defaultLayoutData = this._getLayoutData();

			// 各dividedBoxについて位置やdividerの表示非表示の調整
			var $dividedBoxRoot = this.$find('.' + CLASS_DIVIDEDBOX);
			$dividedBoxRoot.each(this.ownWithOrg(function(orgThis) {
				var $root = $(orgThis);
				var dividedBoxController = $root.data(DATA_DIVIDED_BOX_INSTANCE);
				if (dividedBoxController) {
					var $boxes = $root.children(DIVIDED_BOXES_SELECTOR);
					this._adjustBoxes($boxes, dividedBoxController);
				}
			}));
		},

		// --- イベントハンドラ --- //

		/**
		 * 変更ボタン
		 *
		 * @memberOf h5.ui.container.AccordionPanelController
		 */
		'.changeStateButton click': function(context, $el) {
			context.event.stopPropagation();

			var state = $el.data(DATA_STATE);

			// セレクタが指定されていれば指定されたボックスに対する操作。そうでなければ一番近くのボックス。
			var boxSelector = $el.data(DATA_STATE_BOX_SELECTOR);
			if (boxSelector == null) {
				boxSelector = $el.closest(DIVIDED_BOXES_SELECTOR);
			}

			this.changeState(boxSelector, state);
		},

		'{rootElement} state-change': function(context) {
			if (!this._isAllReady) {
				return;
			}

			var event = context.event;

			var $stateBox = $(event.target);

			var $dividedBox = $stateBox.parent().closest('.' + CLASS_DIVIDEDBOX);
			var $boxes = $dividedBox.children(DIVIDED_BOXES_SELECTOR);

			var dividedBoxController = $dividedBox.data(DATA_DIVIDED_BOX_INSTANCE);
			var stateBoxController = $stateBox.data(DATA_STATE_BOX_INSTANCE);

			if (dividedBoxController == null) {
				this.log.warn('DividedBoxController が取得できませんでした');
				return;
			}
			if (stateBoxController == null) {
				this.log.warn('StateBoxController が取得できませんでした');
				return;
			}

			this._adjustBoxes($boxes, dividedBoxController);
			dividedBoxController.refresh();
		},

		// ---- Public メソッド ---- //
		/**
		 * 指定した box要素 の state を変更します。
		 *
		 * @param {string|Element|jQuery} boxSelector state を変更する box要素 のセレクタ
		 * @param {string} state state（"normal" または "min" を指定する）
		 */
		changeState: function(boxSelector, state) {
			if (boxSelector == null) {
				throw new Error('boxSelector は値を持つ必要があります');
			}

			if (state == null) {
				throw new Error('state は値を持つ必要があります');
			}
			if (typeof state !== 'string') {
				throw new Error('state は string 型である必要があります');
			}
			if (state !== NORMAL_STATE && state !== MIN_STATE) {
				throw new Error('state は "{0}", "{1}" のどちらかである必要があります; state={2}', NORMAL_STATE,
						MIN_STATE, state);
			}

			var $stateBox = $(boxSelector);
			var $dividedBox = $stateBox.parent().closest('.dividedBox');
			var isVertical = $dividedBox.hasClass('vertical');
			var w_h = isVertical ? 'height' : 'width';
			var innerW_H = isVertical ? 'innerHeight' : 'innerWidth';
			var outerW_H = isVertical ? 'outerHeight' : 'outerWidth';
			var l_t = isVertical ? 'top' : 'left';

			var stateBoxController = $stateBox.data(DATA_STATE_BOX_INSTANCE);
			if (stateBoxController == null) {
				this.log.warn('boxSelector "{0}" の要素に StateBox がバインドされていませんでした', boxSelector);
				return;
			}

			// dividedBox内かどうか
			var isInDividedBox = $dividedBox.length !== 0;

			if (!isInDividedBox) {
				this.log.warn('boxSelector "{0}" の要素が dividedBox 外でした', boxSelector);
			}

			var oldState = stateBoxController.getState();

			// stateの変更がない場合は何もしない
			if (state === oldState) {
				return;
			}

			// ダミーがある場合はstate変更前に削除
			var $dummy = $dividedBox.find('>.accodionDummyBox');
			if ($dummy.length) {
				// 全てmin状態で追加したダミーボックスがある場合、削除してからstate変更
				var $dummyDivider = $dividedBox.find('>.accordionDummyDivider');
				$dummyDivider.remove();
				$dummy.remove();
			}

			// state変更前のサイズを覚えておく
			var orgSize = $stateBox[innerW_H]();

			stateBoxController.setState(state);

			var dividedBoxController = isInDividedBox ? $dividedBox.data(DATA_DIVIDED_BOX_INSTANCE)
					: null;

			if (!dividedBoxController) {
				// dividedBox内のStateBoxでないならsetStateして終わり
				return;
			}
			// サイズ変更する方向
			var partition = $stateBox.data(DATA_STATE_CHANGE_DIRECTION) === DIRECTION_BACKWARD ? 1
					: 0;
			// 自分より前が全て最小化されていたら前側にfitToContentsする
			// 自分より後ろが全て最小化されていたら後ろ側にfitToContentsする
			// 前後共に全て最小化されている場合、または、前後共に最小化されていないボックスがある場合は要素に指定されている側にfitToContentsする
			var isPrevAllFixed = !$stateBox.prevAll('.panelBox:not(.fixedSize)').length;
			var isNextAllFixed = !$stateBox.nextAll('.panelBox:not(.fixedSize)').length;
			if (isPrevAllFixed !== isNextAllFixed) {
				partition = isPrevAllFixed ? 0 : 1;
			}
			var $boxes = $dividedBox.children(DIVIDED_BOXES_SELECTOR);
			if (state === NORMAL_STATE) {
				var size = $stateBox.data(NORMAL_STATE_SIZE_DATA_NAME);
				if (!size || size > orgSize) {
					if ($dividedBox.data('dyn-all-minimized')) {
						// 全部min状態だった場合、ダミーボックス削除後は全て前側に寄っている
						// $stateBox以降のmin状態であるボックスを後ろ側に寄せる
						var $prev = $boxes.eq($boxes.length - 1);
						var lastPos = $dividedBox[w_h]();
						while ($prev[0] !== $stateBox[0]) {
							lastPos -= ($prev.data('min-size') || $prev[outerW_H]());
							$prev.css(l_t, lastPos);
							$prev = $prev.prev();
						}
						// 全部min状態なので、dividerは表示されない。normal-stateに変更するボックスの高さはdivider分大きくする
						var nextAllDividerWidth = 0;
						$stateBox.nextAll('.divider').each(function() {
							nextAllDividerWidth += $(this)[outerW_H]();
						});
						$stateBox[w_h]
								(lastPos - parseInt($stateBox.css(l_t)) + nextAllDividerWidth);
						dividedBoxController.refresh();
						$dividedBox.data('dyn-all-minimized', false);
					} else {

						// sizeが可動域を超えていたら、動かせる最大値まで動かす
						var resizebleMaxSize = orgSize;
						var size = $stateBox.data(NORMAL_STATE_SIZE_DATA_NAME);
						$stateBox[partition ? 'prevAll' : 'nextAll']('.box:not(.fixedSize)').each(
								function() {
									var $box = $(this);
									resizebleMaxSize += $box[innerW_H]()
											- ($box.data(DATA_MIN_BOX_SIZE) || 0);
								});
						size = size > resizebleMaxSize ? resizebleMaxSize : size;
						dividedBoxController.resize($stateBox, size, {
							partition: partition
						});
						dividedBoxController.refresh();
					}
				}
			}

			if (state === MIN_STATE) {
				// normalからminへの変更の場合はstate変更前のサイズを記憶する
				$stateBox.data(NORMAL_STATE_SIZE_DATA_NAME, orgSize);

				dividedBoxController.fitToContents($stateBox, {
					partition: partition
				});
				// dividedBox内のボックスに一つでも最小化されていないボックスがあるかどうか
				var existNotMinBox = false;
				$boxes.each(function() {
					var stateBoxCtrl = $(this).data(DATA_STATE_BOX_INSTANCE);
					if (!stateBoxCtrl || stateBoxCtrl.getState() !== MIN_STATE) {
						existNotMinBox = true;
						return false;
					}
				});
				if (!existNotMinBox) {
					// 全てのボックスが最小化されている場合は各ボックスを指定された最小化方向に寄せる処理が必要
					this._allMinStateAdjust(dividedBoxController);
					$dividedBox.data('dyn-all-minimized', true);
				}
			}
		},

		refresh: function(context) {
			for (var i = 0, controllers = this._dividedBoxControllers, l = controllers.length; i < l; i++) {
				controllers[i].refresh();
			}
		},

		// --- Private プロパティ --- //

		_bindedControllers: null,

		_dividedBoxControllers: null,

		_isAllReady: false,

		_isResizing: false,

		_defaultLayoutData: null,

		_isDisableResize: false,

		// --- Private メソッド --- //
		_setDividedBoxesSize: function(dividedBoxController, sizeArray) {
			// 最初にリフレッシュする
			dividedBoxController.refresh();

			// 最後のまで resize すると崩れる
			for (var i = 0, len = sizeArray.length - 1; i < len; i++) {
				var size = sizeArray[i];
				dividedBoxController.resize(i, size);
			}
		},

		_setMinimizableBox: function(elem) {
			var $box = $(elem);

			// 既にstateが定義されていたら何もしない
			if ($box.find('>[data-' + DATA_STATE + ']').length) {
				return;
			}

			// stateが未定義なら中身をnormalのstateにする。minのstateも自動生成する

			var boxName = $box.data(BOX_NAME_DATA_NAME);
			// 最小化する方向はDividedBoxの分割向きに合わせる
			// 縦積みかどうか。verticalが明示的に指定されているなら縦積み
			var isVertical = $box.closest('.' + CLASS_DIVIDEDBOX).hasClass('vertical');
			// 最小化方向はdividedBoxがvertical(縦積み)なら水平方向、横積みなら鉛直方向
			var minimizeDir = isVertical ? 'horizontal' : 'vertical';
			var $boxWrapper = $(this.view.get('panelBoxTemplate', {
				minimizeDir: minimizeDir,
				boxName: boxName
			}));
			var $contents = $box.children();
			$box.append($boxWrapper);
			$boxWrapper.find('.boxContent').append($contents);
		},

		_adjustBoxes: function($boxes, dividedBoxController) {
			/* jshint maxcomplexity: 24, maxdepth: 3 */
			var stateList = $boxes.map(function(i, boxElem) {
				var $box = $(boxElem);
				var controller = $box.data(DATA_STATE_BOX_INSTANCE);
				if (controller == null) {
					return NORMAL_STATE;
				}
				return controller.getState();
			});

			var dividerLastIndex = stateList.length - 1;

			var i, len, state;


			// divider を有効にする位置の計算
			var showDividerFlags = [];
			for (i = 0; i < dividerLastIndex; i++) {
				showDividerFlags.push(false);
			}

			var hasNormal = false;

			for (i = stateList.length - 1; 0 <= i; i--) {
				state = stateList[i];
				if (state !== NORMAL_STATE) {
					continue;
				}

				if (!hasNormal) {
					hasNormal = true;
					continue;
				}

				showDividerFlags[i] = true;
			}

			var $dividedBox = $(dividedBoxController.rootElement);
			var isVertical = $dividedBox.is('.vertical');

			// divider の表示/非表示を反映
			for (i = 0, len = showDividerFlags.length; i < len; i++) {
				var isShowDivider = showDividerFlags[i];
				if (isShowDivider) {
					dividedBoxController.showDivider(i, true);
				} else {
					dividedBoxController.hideDivider(i, true);
				}
			}

			// dividerの設定が終わった後にminのボックスだけをfixedSizeにする
			for (i = 0, len = stateList.length; i < len; i++) {
				if (stateList[i] === MIN_STATE) {
					dividedBoxController.fixSize(i);
				} else {
					dividedBoxController.unfixSize(i);
				}
			}
		},

		_allMinStateAdjust: function(dividedBoxCtrl) {
			// 全てmin状態になった場合は再度位置計算する
			// 後ろのボックスからチェックして、最小化方向がbackwardのものは後ろ側に配置
			// backward指定の無いボックスが出てきたら前側に配置
			var backwardMinLastBoxIndex = boxesLength;
			var $dividedBox = $(dividedBoxCtrl.rootElement);
			var isVertical = $dividedBox.hasClass('vertical');
			var l_t = isVertical ? 'top' : 'left';
			var w_h = isVertical ? 'height' : 'width';
			var outerW_H = isVertical ? 'outerHeight' : 'outerWidth';
			var innerW_H = isVertical ? 'innerHeight' : 'innerWidth';
			var $boxes = $dividedBox.children(DIVIDED_BOXES_SELECTOR);
			var boxesLength = $boxes.length;
			var pos = $dividedBox[innerW_H]();
			var fpos = 0;
			var $backwardMinLastBox = null;
			for (var i = boxesLength - 1; i >= 0; i--) {
				var $b = $boxes.eq(i);
				var $divider = $b.prev('.divider');
				if ($b.data(DATA_STATE_CHANGE_DIRECTION) === DIRECTION_BACKWARD) {
					pos -= $b[outerW_H]();
					$b.css(l_t, pos);
					$divider.css(l_t, pos);
					$backwardMinLastBox = $b;
					backwardMinLastBoxIndex--;
				} else {
					// 残りはforward方向に寄せる
					for (var j = 0; j < i + 1; j++) {
						var $fb = $boxes.eq(j);
						$fb.css(l_t, fpos);
						fpos += $fb[outerW_H]();
						$fb.next('.divider').css(l_t, fpos);
					}
					break;
				}
			}

			// 各ボックスを寄せた時に隙間ができるが、DividedBox部品は隙間に対応していない
			// (隙間がある状態でのリサイズなどに対応していない)ため、AccordionPanel部品で制御する。
			// refreshによる位置計算でここで計算した配置がずれないようにするためにダミーのボックスを追加する
			var $dummy = $('<div class="accodionDummyBox autoSize"></div>');
			if ($backwardMinLastBox) {
				$backwardMinLastBox.before($dummy);
			} else {
				$dividedBox.append($dummy);
				backwardMinLastBoxIndex = boxesLength - 1;
			}
			$dummy.css(w_h, pos - fpos - 4);
			dividedBoxCtrl.refresh();
			// 新規追加されたdividerを隠す
			dividedBoxCtrl.hideDivider(backwardMinLastBoxIndex);
			// 新規追加されたdividerにクラスを当てる
			$dividedBox.find('>.divider').eq(backwardMinLastBoxIndex).addClass(
					'accordionDummyDivider');
		},

		_resizeDividedBoxContents: function($el) {
			/* jshint maxdepth: 3 */
			if (this._isDisableResize) {
				return;
			}

			var inLoop = this._isResizing;
			this._isResizing = true;

			var $boxes = $el.children(DIVIDED_BOXES_SELECTOR);
			var controller = $el.data(DATA_DIVIDED_BOX_INSTANCE);

			var stateList = $boxes.map(function(i, boxElem) {
				var $box = $(boxElem);
				var stateBoxController = $box.data(DATA_STATE_BOX_INSTANCE);
				if (stateBoxController == null) {
					return NORMAL_STATE;
				}
				return stateBoxController.getState();
			});

			controller.refresh();

			var i, state;

			var lastIndex = $boxes.length - 1;
			var lastNormalIndex = null;

			// 一番最後の normal を探す
			for (i = lastIndex; 0 <= i; i--) {
				state = stateList[i];
				if (state === NORMAL_STATE) {
					lastNormalIndex = i;
					break;
				}
			}

			// normal がなかったら最後一個前を normal 扱いにする
			if (lastNormalIndex == null) {
				lastNormalIndex = lastIndex - 1;
			}

			// lastNormalIndex より後は下（右）方向に fitToContents
			for (i = lastIndex; lastNormalIndex < i; i--) {
				controller.fitToContents(i, {
					partition: 1
				});
			}

			// lastNormalIndex より前の min を上（左）方向に fitToContents
			for (i = 0; i < lastNormalIndex; i++) {
				state = stateList[i];
				if (state === MIN_STATE) {
					controller.fitToContents(i, {
						partition: 0
					});
				}
			}


			var selector = '.' + CLASS_DIVIDEDBOX;

			$el.find(selector).each(this.own(function(i, child) {
				var $child = $(child);
				if (!$child.parent().closest(selector).is($el)) {
					return;
				}

				if ($child.is(':hidden')) {
					return;
				}

				this._resizeDividedBoxContents($child);
			}));

			if (!inLoop) {
				this._refreshGrid();
				this._isResizing = false;
			}
		},

		_getLayoutData: function() {
			var layoutData = [];

			var $dividedBoxes = this.$find('.dividedBox');
			$dividedBoxes.each(function(i, dividedBox) {
				var $dividedBox = $(dividedBox);
				var isVertical = $dividedBox.hasClass('vertical');
				var sizeMethod = isVertical ? 'outerHeight' : 'outerWidth';

				var dividedBoxData = [];

				$dividedBox.children(DIVIDED_BOXES_SELECTOR).each(function(j, box) {
					var $box = $(box);
					var size = $box[sizeMethod]();

					var boxData = {};

					var stateBoxController = $box.data(DATA_STATE_BOX_INSTANCE);
					if (stateBoxController == null) {
						boxData.size = size;
					} else if (stateBoxController.getState() === MIN_STATE) {
						boxData.state = MIN_STATE;
						boxData.normalStateSize = $box.data(NORMAL_STATE_SIZE_DATA_NAME);
					} else {
						boxData.state = NORMAL_STATE;
						boxData.size = size;
					}

					dividedBoxData.push(boxData);
				});

				layoutData.push(dividedBoxData);
			});

			return layoutData;
		}
	};

	// =========================================================================
	//
	// 外部への公開
	//
	// =========================================================================

	h5.core.expose(accordionPanelController);

})();
