/*
 * Copyright (C) 2016-2017 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
(function() {
	'use strict';

	function FocusGroup(elem, groupName) {
		this.element = elem;
		this.name = groupName;
	}

	function contains(element, containerElement) {
		return containerElement.compareDocumentPosition(element)
				& Node.DOCUMENT_POSITION_CONTAINED_BY;
	}

	var isKeyboardEventCtorSupported = typeof KeyboardEvent === 'function';

	var focusController = {
		/**
		 * @memberOf h5.ui.components.stage.FocusController
		 */
		__name: 'h5.ui.components.stage.FocusController',

		/**
		 * @private
		 */
		_currentFocusGroupElement: null,

		/**
		 * @private
		 */
		_currentFocusGroupName: null,

		/**
		 * @private
		 */
		_lastClickElement: null,

		/**
		 * @private
		 */
		_focusRootElement: null,

		/**
		 * @private
		 */
		_hasFocus: null,

		isKeyEventEmulationEnabled: true,

		__ready: function() {
			this._focusRootElement = null;
			this._hasFocus = false;
		},

		'{document} mousedown': function(context, $el) {
			this._updateFocus(context.event.target);
		},

		'{document} touchstart': function(context, $el) {
			this._updateFocus(context.event.target);
		},

		'{document} keydown': function(context, $el) {
			this._processKeyEvent(context.event);
		},

		'{document} keypress': function(context) {
			this._processKeyEvent(context.event);
		},

		'{document} keyup': function(context) {
			this._processKeyEvent(context.event);
		},

		/**
		 * @private
		 */
		_processKeyEvent: function(event) {
			if (!this.isKeyEventEmulationEnabled || event.originalEvent.isFocusEmulated === true
					|| event.isFocusEmulated === true || !this._hasFocus) {
				//エミュレーションして出したイベントの場合、または
				//現在指定した要素がフォーカスを持っていない場合は二重処理しない
				return;
			}

			var activeElement = document.activeElement;
			if (activeElement) {
				var activeElementName = activeElement.tagName.toLowerCase();
				if (activeElementName === 'input' || activeElementName === 'textarea'
						|| activeElementName === 'select') {
					//input, textarea, selectがアクティブな状態で発生したキーイベントの場合は何もしない
					return;
				}
			}

			var focused = this.getFocusedElement();
			if (focused) {
				this._dispatchPseudoKeyboardEvent(event.originalEvent, focused);
			}
		},

		/**
		 * @private
		 */
		_dispatchPseudoKeyboardEvent: function(originalEvent, eventSource) {
			//DOM4では new KeyboardEvent()とすべき。
			//しかし、IE11では KeyboardEventはコンストラクタとして使えない。
			//KeyboardEventコンストラクタをサポートしているのはChrome, Firefox31以降（IEは非対応）

			var pseudoEvent;

			if (isKeyboardEventCtorSupported) {
				pseudoEvent = new KeyboardEvent(originalEvent.type, originalEvent);
				pseudoEvent.isFocusEmulated = true;
				eventSource.dispatchEvent(pseudoEvent);
				return;
			}

			//KeyboardEventコンストラクタをサポートしていない場合は
			//jQuery Eventでエミュレート(IE11等)

			pseudoEvent = $.event.fix(originalEvent);
			pseudoEvent.isFocusEmulated = true;
			pseudoEvent.target = eventSource;
			pseudoEvent.currentTarget = eventSource;

			$(eventSource).trigger(pseudoEvent);

			//IE11, Chrome51
			//Chrome, Safari(WebKit系ブラウザ)は、initKeyboardEvent()にバグがあり
			//keyやkeyCodeなどが正しくセットされず、実質使用できない。
			//また、IEにおいても、initKeyboardEvent()で設定されるのはkeyのみで、
			//keyCodeなど他の値は正しく設定されない。
			//しかも、char, which, keyCode等は読み取り専用になっており
			//後から設定することもできない(IE11)。

		},

		/**
		 * @private
		 */
		_updateFocus: function(element) {
			if (!element) {
				this.log.debug('_updateFocus: フォーカス要素がnullです。フォーカスは変更されませんでした。');
				return;
			}

			this._lastClickElement = element;

			var focusRoot = this._focusRootElement ? this._focusRootElement : this.rootElement;
			if (element === focusRoot || contains(element, focusRoot)) {
				//ルート要素またはその子要素ならフォーカスを持つ
				this._hasFocus = true;
			} else {
				this._hasFocus = false;
			}

			var activeElement = document.activeElement;

			if (this._hasFocus && !contains(activeElement, focusRoot)) {
				//自分が疑似フォーカスを獲得し、かつ
				//直前のactiveElementが自分の範囲外の要素だったら
				//その要素のフォーカスを外す
				activeElement.blur();
			}

			var $t = $(element);

			var groupElement = $t.parents('[data-h5-focus-group]').get(0);
			this._currentFocusGroupElement = groupElement;

			if (groupElement) {
				this._currentFocusGroupName = $(groupElement).data('h5FocusGroup');
			} else {
				this._currentFocusGroupName = null;
			}
		},

		getFocusedGroup: function() {
			var focus;
			if (!this._currentFocusGroupElement) {
				focus = new FocusGroup(document.body, null);
			} else {
				focus = new FocusGroup(this._currentFocusGroupElement, this._currentFocusGroupName);
			}
			return focus;
		},

		setFocusedElement: function(element) {
			this._updateFocus(element);
		},

		getFocusedElement: function() {
			return this._lastClickElement;
		},

		setFocusRootElement: function(element) {
			this._focusRootElement = element;
		},

		hasFocus: function(rootElement) {
			return this._hasFocus;
		}
	};

	h5.core.expose(focusController);

})();

(function($) {
	'use strict';

	var classManager = h5.cls.manager;

	var RootClass = classManager.getClass('h5.cls.RootClass');
	var Event = classManager.getClass('h5.event.Event');
	var EventDispatcher = classManager.getClass('h5.event.EventDispatcher');
	var PropertyChangeEvent = classManager.getClass('h5.event.PropertyChangeEvent');

	var DragMode = {
		NONE: 0,
		AUTO: 1,
		SCREEN: 2,
		DU: 3,
		SELECT: 4,
		REGION: 5
	};

	var ScrollDirection = {
		NONE: 0,
		X: 1,
		Y: 2,
		XY: 3
	};

	var REASON_RENDER_REQUEST = '__duRenderRequest__';
	var REASON_SIZE_CHANGE = '__duSizeChange__';
	var REASON_POSITION_CHANGE = '__duPositionChange__';
	var REASON_VISIBILITY_CHANGE = '__duVisibilityChange__';
	var REASON_SCALE_CHANGE = '__duScaleChange__';
	var REASON_Z_INDEX_CHANGE = '__duZIndexChange__';
	var REASON_INITIAL_RENDER = '__duInitialRender__';
	var REASON_SCROLL_POSITION_CHANGE = '__duScrollPositionChange__';
	var REASON_SELECTION_CHANGE = '__duSelectionChange__';
	var REASON_FOCUS_CHANGE = '__duFocusChange__';
	var REASON_GLOBAL_POSITION_CHANGE = '__duGlobalPositionChange__';

	var UpdateReasons = {
		RENDER_REQUEST: REASON_RENDER_REQUEST,
		SIZE_CHANGE: REASON_SIZE_CHANGE,
		POSITION_CHANGE: REASON_POSITION_CHANGE,
		VISIBILITY_CHANGE: REASON_VISIBILITY_CHANGE,
		SCALE_CHANGE: REASON_SCALE_CHANGE,
		Z_INDEX_CHANGE: REASON_Z_INDEX_CHANGE,
		INITIAL_RENDER: REASON_INITIAL_RENDER,
		SCROLL_POSITION_CHANGE: REASON_SCROLL_POSITION_CHANGE,
		SELECTION_CHANGE: REASON_SELECTION_CHANGE,
		FOCUS_CHANGE: REASON_FOCUS_CHANGE,
		GLOBAL_POSITION_CHANGE: REASON_GLOBAL_POSITION_CHANGE
	};

	h5.u.obj.expose('h5.ui.components.stage', {
		DragMode: DragMode,
		ScrollDirection: ScrollDirection,
		UpdateReasons: UpdateReasons
	});


	function containsElement(element, containerElement) {
		return containerElement.compareDocumentPosition(element)
				& Node.DOCUMENT_POSITION_CONTAINED_BY;
	}

	/**
	 * 指定された範囲内の値を返す。min,maxの値は含む(value > maxの場合、返る値はmax)。<br>
	 * min,maxにnullを指定した場合はその方向の上/下限は無視する。<br>
	 *
	 * @private
	 * @param value 値
	 * @param min 最小値(nullの場合は無視)
	 * @param max 最大値(nullの場合は無視)
	 * @returns クランプされた値
	 */
	function clamp(value, min, max) {
		if (value == null) {
			return value;
		}

		if (min != null && value < min) {
			return min;
		}
		if (max != null && value > max) {
			return max;
		}
		return value;
	}

	h5.u.obj.expose('h5.ui.components.stage.StageUtil', {
		clamp: clamp,
		containsElement: containsElement
	});

	/**
	 * DragSession
	 * <p>
	 * DisplayUnitのドラッグ操作を行うためのクラスです。
	 * </p>
	 *
	 * @class
	 * @name DragSession
	 * @param super_ スーパーオブジェクト
	 * @returns クラス定義
	 */
	EventDispatcher.extend(function(super_) {
		//eventはnullの場合がある（doPseudoMoveByの場合）
		function defaultMoveFunction(du, data, event, delta, dragSession) {
			var ret = {
				dx: delta.x,
				dy: delta.y
			};
			return ret;
		}

		var desc = {
			name: 'h5.ui.components.stage.DragSession',
			field: {
				canDrop: null,

				//ステージコントローラ
				_stage: null,

				//このドラッグセッションを非同期で行うかのフラグ
				async: null,

				/**
				 * ドラッグ操作対象オブジェクト
				 */
				_targets: null,

				//ドラッグ中のカーソル制御範囲(setCursor()のcursorスタイルの付与先)
				_cursorRoot: null,

				//_targetsで指定されたオブジェクトの初期位置を覚えておく配列。
				//setTarget()のタイミングでセットされる。
				//同じインデックスの位置を保持。
				_targetInitialPositions: null,

				//各ドラッグ対象のドラッグ開始直前の親DU
				_targetInitialParentDU: null,

				//ドラッグ開始時のPagePosition
				_startPageX: null,
				_startPageY: null,

				//最後のmousemove時のPagePosition
				_lastPageX: null,
				_lastPageY: null,

				//開始場所を原点としたときの、現在のカーソル位置の座標差分
				_moveX: null,
				_moveY: null,

				//開始時点を0としたときの、現在までのカーソルの移動総量
				//こちらはmoveXYと異なり延べ距離を表す。
				_totalMoveX: null,
				_totalMoveY: null,

				//ドラッグプロキシ。DUではなく通常のDOM要素を指定する必要がある。
				_proxyElement: null,

				//このドラッグセッションの完了フラグ
				_isCompleted: null,

				//移動関数。移動対象のDUごとに呼ばれる
				_moveFunction: null,


				//du.id -> 当該DU用のdataオブジェクト へのマップ
				_moveFunctionDataMap: null
			},
			accessor: {
				isCompleted: {
					get: function() {
						return this._isCompleted;
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.DragSession
				 * @param target
				 * @param dragMode
				 */
				constructor: function DragSession(stage, rootElement, event) {
					super_.constructor.call(this);

					this._stage = stage;

					this.canDrop = true;
					this.async = false;

					this._isCompleted = false;

					/**
					 * @private
					 */
					this._moveFunction = defaultMoveFunction;

					this._moveFunctionDataMap = {};

					this._proxyElement = null;

					this._cursorRoot = rootElement;

					//TODO touchイベント、pointer event対応
					this._startPageX = event.pageX;
					this._startPageY = event.pageY;

					this._lastPageX = event.pageX;
					this._lastPageY = event.pageY;

					this._moveX = 0;
					this._moveY = 0;

					this._totalMoveX = 0;
					this._totalMoveY = 0;
				},

				/**
				 * 指定された位置に移動
				 * <p>
				 * このメソッドを使って図形を移動すると、見た目の位置のみが変化します。図形(ArtShape)のmoveToやmoveByは呼ばれません。
				 * ユーザによるドラッグ操作等の、移動先が未確定の場合の図形の移動のためのメソッドです。
				 * </p>
				 * <p>
				 * このメソッドで移動した位置に、図形の位置を確定させたい場合は、endを呼んでください。
				 * </p>
				 * <p>
				 * 引数にはドラッグセッション開始位置からの移動量(x,y)を指定します。
				 * </p>
				 *
				 * @memberOf DragSession
				 * @instance
				 * @param {number} x
				 * @param {number} y
				 */
				setTarget: function(target) {
					this._targets = target;
					this._saveInitialStates();
				},

				getTarget: function() {
					return this._targets;
				},

				setMoveFunction: function(func) {
					this._moveFunction = func;
				},

				setProxyElement: function(element) {
					this._proxyElement = element;
				},

				getProxyElement: function() {
					return this._proxyElement;
				},

				begin: function() {
					this._setDraggingFlag(true);
				},

				/**
				 * ドラッグセッションを終了して位置を確定させる
				 * <p>
				 * moveメソッドを使って移動させた位置で、図形の位置を確定します。ただし、canDropがfalseの場合には代わりにキャンセルが行われます。
				 * </p>
				 *
				 * @memberOf DragSession
				 * @instance
				 * @returns {DragSession}
				 */
				end: function() {
					if (this._isCompleted) {
						return;
					}
					this._isCompleted = true;

					if (!this.canDrop) {
						//ドロップできない場合はキャンセル処理を行う
						this.cancel();
						return;
					}

					this._setDraggingFlag(false);

					this._cleanUp();

					var event = Event.create('dragSessionEnd');
					this.dispatchEvent(event);
				},

				/**
				 * ドラッグセッションを終了して位置を元に戻す
				 * <p>
				 * moveメソッドで移動させた処理を元に戻します。
				 * </p>
				 *
				 * @memberOf DragSession
				 * @returns {DragSession}
				 */
				cancel: function(andRollbackPosition) {
					if (this._isCompleted) {
						return;
					}
					this._isCompleted = true;

					if (andRollbackPosition !== false) {
						//引数に明示的にfalseを渡された場合を除き、
						//ドラッグしていたDUの位置を戻す
						this._rollbackStates();
					}

					this._setDraggingFlag(false);

					this._cleanUp();

					var event = Event.create('dragSessionCancel');
					this.dispatchEvent(event);
				},

				//カーソル位置は移動していないが対象を移動させたい場合に呼び出す。
				//（境界スクロールなどのときに使用）
				//引数にはディスプレイ座標系での移動差分量を渡す。
				doPseudoMoveBy: function(dx, dy) {
					var delta = {
						x: dx,
						y: dy
					};

					this._deltaMove(null, delta);
				},

				doMove: function(event) {
					if (this._isCompleted) {
						return;
					}

					var cursorDx = event.pageX - this._lastPageX;
					var cursorDy = event.pageY - this._lastPageY;

					this._lastPageX = event.pageX;
					this._lastPageY = event.pageY;

					this._moveX = event.pageX - this._startPageX;
					this._moveY = event.pageY - this._startPageY;

					//totalMoveXYには絶対値で積算していく
					this._totalMoveX += cursorDx < 0 ? -cursorDx : cursorDx;
					this._totalMoveY += cursorDy < 0 ? -cursorDy : cursorDy;

					//前回からの差分移動量
					var delta = {
						x: cursorDx,
						y: cursorDy
					};

					this._deltaMove(event, delta);
				},

				setCursor: function(cursorStyle) {
					if (cursorStyle == null) {
						cursorStyle = '';
					}
					$(this._cursorRoot).css('cursor', cursorStyle);
				},

				/**
				 * セットされた各ターゲットのドラッグ開始時点の位置を覚えておく
				 *
				 * @private
				 */
				_saveInitialStates: function() {
					if (!this._targets) {
						return;
					}

					var parentDUs = [];
					var positions = [];
					var targets = Array.isArray(this._targets) ? this._targets : [this._targets];
					for (var i = 0, len = targets.length; i < len; i++) {
						var t = targets[i]; //DU
						var pos = {
							x: t.x,
							y: t.y
						};
						positions.push(pos);
						parentDUs.push(t.parentDisplayUnit);
					}

					this._targetInitialPositions = positions;
					this._targetInitialParentDU = parentDUs;
				},

				/**
				 * @private
				 */
				_deltaMove: function(event, delta) {
					if (!this._targets) {
						return;
					}

					var targets = this._targets;
					if (!Array.isArray(targets)) {
						targets = [targets];
					}

					for (var i = 0, len = targets.length; i < len; i++) {
						var du = targets[i];

						var data = this._moveFunctionDataMap[du.id];
						if (!data) {
							data = {};
							this._moveFunctionDataMap[du.id] = data;
						}

						var move = this._moveFunction(du, data, event, delta, this);
						if (!move) {
							continue;
						}

						var dx = typeof move.dx === 'number' ? move.dx : 0;
						var dy = typeof move.dy === 'number' ? move.dy : 0;

						if (dx === 0 && dy === 0) {
							continue;
						}
						if (move.isWorld === true) {
							du.moveBy(dx, dy);
						} else {
							du.moveDisplayBy(dx, dy);
						}
					}

					this._stage._viewCollection.__onDragDUMove(this);
				},

				/**
				 * @private
				 */
				_rollbackStates: function() {
					if (!this._targets) {
						return;
					}

					var targets = Array.isArray(this._targets) ? this._targets : [this._targets];
					for (var i = 0, len = targets.length; i < len; i++) {
						var du = targets[i];
						var pos = this._targetInitialPositions[i];
						du.moveTo(pos.x, pos.y);
					}
				},

				/**
				 * @private
				 */
				_cleanUp: function() {
					this._targets = null;
					this._targetInitialPositions = null;
					this._targetInitialParentDU = null;
					this._cursorRoot = null;
					this._moveFunction = null;
					this._moveFunctionDataMap = null;

					if (this._proxyElement) {
						$(this._proxyElement).remove();
						this._proxyElement = null;
					}
				},

				/**
				 * @private
				 */
				_setDraggingFlag: function(value) {
					if (!this._targets) {
						return;
					}

					var targets = Array.isArray(this._targets) ? this._targets : [this._targets];
					for (var i = 0, len = targets.length; i < len; i++) {
						var du = targets[i];
						du._isDragging = value;
					}
				}
			}
		};
		return desc;
	});


	var Rect = RootClass
			.extend(function(super_) {
				var desc = {
					name: 'h5.ui.components.stage.Rect',
					field: {
						x: null,
						y: null,
						width: null,
						height: null
					},

					method: {
						/**
						 * @memberOf h5.ui.components.stage.Rect
						 */
						constructor: function Rect(x, y, width, height) {
							super_.constructor.call(this);
							this.x = x !== undefined ? x : 0;
							this.y = y !== undefined ? y : 0;
							this.width = width !== undefined ? width : 0;
							this.height = height !== undefined ? height : 0;
						},
						setRect: function(x, y, width, height) {
							if (x != null) {
								this.x = x;
							}
							if (y != null) {
								this.y = y;
							}
							if (width != null) {
								this.width = width;
							}
							if (height != null) {
								this.height = height;
							}
						},

						setLocation: function(x, y) {
							if (x != null) {
								this.x = x;
							}
							if (y != null) {
								this.y = y;
							}
						},

						setSize: function(width, height) {
							if (width != null) {
								this.width = width;
							}
							if (height != null) {
								this.height = height;
							}
						},

						/**
						 * 引数のrectが表す領域を、このRectが表す領域が完全に含んでいるかどうかを返します。部分的にのみ含んでいる場合はfalseです。
						 *
						 * @param rect
						 */
						contains: function(rect) {
							if (rect.x >= this.x && (rect.x + rect.width) <= (this.x + this.width)
									&& rect.y >= this.y
									&& (rect.y + rect.height) <= (this.y + this.height)) {
								return true;
							}
							return false;
						},

						/**
						 * 引数で指定された点がこのRectに含まれるかどうかを判定します。辺の上の場合も「含まれる」と判定します。
						 *
						 * @param x X座標
						 * @param y Y座標
						 * @returns {Boolean} 引数で指定された点がこのRectに含まれるかどうか
						 */
						containsPoint: function(x, y) {
							if (this.x <= x && x <= (this.x + this.width) && this.y <= y
									&& y <= (this.y + this.height)) {
								return true;
							}
							return false;
						}
					}
				};
				return desc;
			});


	var Point = RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.Point',
			field: {
				x: null,
				y: null
			},
			method: {
				/**
				 * @memberOf 'h5.ui.components.stage.Point
				 */
				constructor: function Point(x, y) {
					super_.constructor.call(this);
					this.x = x;
					this.y = y;
				}
			}
		};
		return desc;
	});

	var WorldPoint = Point.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.WorldPoint',
			method: {
				/**
				 * @memberOf h5.ui.components.stage.WorldPoint
				 */
				constructor: function WorldPoint(x, y) {
					super_.constructor.call(this, x, y);
				}
			}
		};
		return desc;
	});

	Point.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.DisplayPoint',
			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayPoint
				 */
				constructor: function DisplayPoint(x, y) {
					super_.constructor.call(this, x, y);
				}
			}
		};
		return desc;
	});

	var SVGPoint = Point.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGPoint',
			method: {
				constructor: function SVGPoint(x, y) {
					super_.constructor.call(this, x, y);
				},
				toString: function() {
					return this.x + ',' + this.y;
				}
			}
		};
		return desc;
	});

	function createSvgElement(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	function setSvgAttribute(element, key, value) {
		setAttributeNS(element, null, key, value);
	}

	function setAttributeNS(element, ns, key, value) {
		if (value && value.isDefinition && value.definitionUrl) {
			element.setAttributeNS(ns, key, value.definitionUrl);
			return;
		}
		element.setAttributeNS(ns, key, value);
	}

	function setSvgAttributes(element, param) {
		for ( var key in param) {
			setSvgAttribute(element, key, param[key]);
		}
	}

	function removeAttributeNS(element, ns, key) {
		element.removeAttributeNS(ns, key);
	}

	function removeSvgAttribute(element, key) {
		removeAttributeNS(element, null, key);
	}

	function removeSvgAttributes(element, keys) {
		for (var i = 0; i < keys.length; i++) {
			removeSvgAttribute(element, key[i]);
		}
	}

	var SvgUtil = {
		createElement: createSvgElement,
		setAttribute: setSvgAttribute,
		setAttributes: setSvgAttributes,
		removeAttribute: removeSvgAttribute,
		removeAttributes: removeSvgAttributes
	};
	h5.u.obj.expose('h5.ui.components.stage', {
		SvgUtil: SvgUtil
	});

	var NS_XLINK = "http://www.w3.org/1999/xlink";

	var ERR_MUST_OVERRIDE_RENDER_FUNCTION = 'SVGDrawElementのrenderメソッドは、その子クラスで必ずオーバーライドする必要があります。';

	var SVGElementWrapper = RootClass.extend(function(super_) {

		function getChangedAttributes() {
			return {
				changed: new Map(),
				removed: new Map(),
				addChanged: function(name, ns) {
					if (!this.changed.has(name)) {
						this.changed.set(name, {
							name: name,
							ns: ns
						});
					}
					this.removed['delete'](name);
				},
				addRemoved: function(name, ns) {
					if (!this.removed.has(name)) {
						this.removed.set(name, {
							name: name,
							ns: ns
						});
					}
					this.changed['delete'](name);
				},
				removeEntry: function(name) {
					this.changed['delete'](name);
					this.removed['delete'](name);
				}
			};
		}

		var desc = {
			name: 'h5.ui.components.stage.SVGElementWrapper',
			field: {
				_element: null,
				_graphics: null,

				_isDefinition: null,
				_classes: null,
				_attributes: null,
				_changedAttributes: null
			},
			accessor: {
				isDefinition: {
					get: function() {
						return this._isDefinition;
					}
				},
				definitionUrl: {
					get: function() {
						var id = this.id;
						return this.isDefinition && id ? 'url(#' + this.id + ')' : null;
					}
				},
				id: {
					get: function() {
						return this.getAttribute('id');
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGElementWrapper
				 */
				constructor: function SVGElementWrapper(graphics, element, id) {
					super_.constructor.call(this);
					this._element = element;
					this._graphics = graphics;

					this._isDefinition = false;
					this._classes = [];
					this._attributes = new Map();
					this._changedAttributes = getChangedAttributes();

					if (id) {
						this._setAttribute('id', id, true);
					}
				},
				requestRender: function() {
					if (this._graphics) {
						this._graphics._addToRenderWaitingList(this);
					} else {
						//graphicsに属していない場合は直ちに描画する
						this.render();
					}
				},
				render: function() {
					throw new Error(ERR_MUST_OVERRIDE_RENDER_FUNCTION);
				},
				getAttribute: function(key) {
					return this._attributes.has(key) ? this._attributes.get(key) : null;
				},
				getXLinkAttribute: function(key) {
					return this.getAttribute(key);
				},
				setAttribute: function(key, value) {
					this._setAttribute(key, value, this.isDefinition);
				},
				setAttributes: function(param) {
					this._setAttributes(param, this.isDefinition);
				},
				setXLinkAttribute: function(key, value) {
					this._setXLinkAttribute(key, value, this.isDefinition);
				},
				setXLinkAttributes: function(param) {
					this._setXLinkAttributes(param, this.isDefinition);
				},

				/**
				 * @private
				 */
				_setAttribute: function(key, value, sync) {
					this._setAttributeNS(null, key, value, sync);
				},

				/**
				 * @private
				 */
				_setAttributes: function(param, sync) {
					for ( var key in param) {
						if (param.hasOwnProperty(key)) {
							this.setAttribute(key, param[key], sync);
						}
					}
				},

				/**
				 * @private
				 */
				_setXLinkAttribute: function(key, value, sync) {
					this._setAttributeNS(NS_XLINK, key, value, sync);
				},

				/**
				 * @private
				 */
				_setXLinkAttributes: function(params, sync) {
					for ( var key in param) {
						if (param.hasOwnProperty(key)) {
							this.setXLinkAttribute(key, param[key], sync);
						}
					}
				},

				/**
				 * @private
				 */
				_setAttributeNS: function(ns, key, value, sync) {
					if (value === null) {
						this.removeAttribute(key);
						return;
					}

					if (this._attributes.get(key) === value) {
						return;
					}

					this._attributes.set(key, value);
					if (sync) {
						this._changedAttributes.removeEntry(key);
						setAttributeNS(this._element, ns, key, value);
					} else {
						this._changedAttributes.addChanged(key, ns);
						this.requestRender();
					}
				},
				removeAttribute: function(key, sync) {
					this._removeAttributeNS(null, key, sync);
				},
				removeXLinkAttribute: function(key, sync) {
					this._removeAttributeNS(NS_XLINK, key, sync);
				},

				/**
				 * @private
				 */
				_removeAttributeNS: function(ns, key, sync) {
					// FIXME deleteがエラーとして表示される
					if (!this._attributes.has(key)) {
						return;
					}

					this._attributes['delete'](key);
					if (sync) {
						this._changedAttributes.removeEntry(key);
						removeAttributeNS(this._element, ns, key);
					} else {
						this._changedAttributes.addRemoved(key, ns);
						this.requestRender();
					}
				},
				removeAttributes: function(keys, sync) {
					for (var i = 0; i < keys.length; i++) {
						this.removeAttribute(keys[i], sync);
					}
				},
				addClass: function(className, sync) {
					for (var i = 0; i < this._classes.length; i++) {
						if (this._classes[i] === className) {
							return;
						}
					}
					this._classes.push(className);
					this.setAttribute('class', this._classes.join(' '), sync);
				},
				removeClass: function(className, sync) {
					for (var i = 0; i < this._classes.length; i++) {
						if (this._classes[i] === className) {
							this._classes.splice(i, 1);
							this.setAttribute('class', this._classes.join(' '), sync);
							break;
						}
					}
				},

				/**
				 * @private
				 */
				_renderChangedAttributes: function() {
					// Delete removed attributes
					var attrChanged = false;
					var element = this._element;
					var removed = this._changedAttributes.removed;
					if (removed.size) {
						removed.forEach(function(value, key) {
							removeAttributeNS(element, value.ns, key);
						});
						removed.clear();
						attrChanged = true;
					}

					var changed = this._changedAttributes.changed;
					if (changed.size) {
						var attributes = this._attributes;
						changed.forEach(function(value, key) {
							setAttributeNS(element, value.ns, key, attributes.get(key));
						});
						changed.clear();
						attrChanged = true;
					}

					return attrChanged;
				}
			}
		};
		return desc;
	});

	var SVGDrawElement = SVGElementWrapper.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGDrawElement',
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGDrawElement
				 */
				constructor: function SVGDrawElement(graphics, element, id) {
					super_.constructor.call(this, graphics, element, id);
				}
			}
		};
		return desc;
	});

	/**
	 * @param {Object} target
	 * @param {string[]} attrNames
	 */
	function addSimpleSVGAccessor(target, attrNames) {
		for (var i = 0; i < attrNames.length; i++) {
			var attrName = attrNames[i];
			var name = attrName.replace(/-(.)/g, function(match) {
				return match.charAt(1).toUpperCase();
			});

			target[name] = (function(attrName) {
				return {
					get: function() {
						return this.getAttribute(attrName);
					},
					set: function(value) {
						this.setAttribute(attrName, value);
					}
				};
			})(attrName);
		}
	}

	/**
	 * @param {Object} target
	 * @param {String[]} attrNames
	 */
	function addSimpleXLinkAccessor(target, attrNames) {
		for (var i = 0; i < attrNames.length; i++) {
			var attrName = attrNames[i];
			var name = attrName.replace(/-(.)/g, function(match) {
				return match.charAt(1).toUpperCase();
			});

			target[name] = (function(attr) {
				return {
					get: function() {
						return this.getXLinkAttribute(attr);
					},
					set: function(value) {
						this.setXLinkAttribute(attr, value);
					}
				};
			})(attrName);
		}
	}

	var SVGLine = SVGDrawElement.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGLine',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGLine
				 */
				constructor: function SVGLine(graphics, element) {
					super_.constructor.call(this, graphics, element);
				},
				render: function() {
					this._renderChangedAttributes();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x1', 'x2', 'y1', 'y2', 'stroke', 'stroke-width',
				'fill']);
		return desc;
	});

	var SVGText = SVGDrawElement.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGText',
			field: {
				_textContent: null,
				_text: null
			},
			accessor: {
				dominantBaseline: {
					get: function() {
						return this.getAttribute('dominant-baseline');
					},
					set: function(value) {
						switch (value) {
						case 'auto':
						case 'alphabetic':
						case 'text-before-edge':
						case 'central':
						case 'text-after-edge':
							this.setAttribute('dominant-baseline', value);
							break;
						}
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGText
				 */
				constructor: function SVGText(graphics, element) {
					super_.constructor.call(this, graphics, element);
					this._textContent = this._text = null;
				},
				render: function() {
					var changed = this._renderChangedAttributes();

					if (this._text) {
						this._element.textContent = this._textContent = this._text;
						this._text = null;
						changed = true;
					}

					if (!changed) {
						return;
					}

					// IEのdominant-baselineハック
					// TODO translate実装時に、位置を修正する必要がある
					if (!h5.env.ua.isIE) {
						return;
					}

					var dominantBaseline = this.dominantBaseline;
					var dy = 0;
					if (dominantBaseline && dominantBaseline !== 'auto'
							&& dominantBaseline !== 'alphabetic') {
						var y = this.y || 0; // TODO y座標が数字以外の場合
						var bbox = this._element.getBBox();

						switch (dominantBaseline) {
						case 'text-before-edge':
							dy = y - bbox.y;
							break;
						case 'text-after-edge':
							dy = y - bbox.y - bbox.height;
							break;
						case 'central':
							dy = y - bbox.y - bbox.height / 2;
							break;
						}
					}

					this._setAttribute('transform', 'translate(0, ' + dy + ')', true);
				},
				setText: function(text) {
					if (this._textContent !== text) {
						this._text = text;
						this.requestRender();
					}
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x', 'y', 'dx', 'dy', 'text-anchor', 'font-family',
				'font-size', 'font-weight', 'fill', 'rotate']);
		return desc;
	});

	var SVGRect = SVGDrawElement.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGRect',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGRect
				 */
				constructor: function SVGRect(graphics, element) {
					super_.constructor.call(this, graphics, element);
				},
				render: function() {
					this._renderChangedAttributes();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x', 'y', 'width', 'height', 'stroke', 'stroke-width',
				'fill', 'rx', 'ry']);
		return desc;
	});

	var SVGCircle = SVGDrawElement.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGCircle',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGCircle
				 */
				constructor: function SVGCircle(graphics, element) {
					super_.constructor.call(this, graphics, element);
				},
				render: function() {
					this._renderChangedAttributes();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['cx', 'cy', 'r', 'stroke', 'stroke-width', 'fill']);
		return desc;
	});

	var SVGTriangle = SVGDrawElement.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGTriangle',
			field: {
				_topX: null,
				_topY: null,
				_width: null,
				_height: null,
				_direction: null
			},
			accessor: {
				topX: {
					get: function() {
						return this._topX;
					},
					set: function(value) {
						this._topX = value;
						this.requestRender();
					}
				},
				topY: {
					get: function() {
						return this._topY;
					},
					set: function(value) {
						this._topY = value;
						this.requestRender();
					}
				},
				width: {
					get: function() {
						return this._width;
					},
					set: function(value) {
						this._width = value;
						this.requestRender();
					}
				},
				height: {
					get: function() {
						return this._height;
					},
					set: function(value) {
						this._height = value;
						this.requestRender();
					}
				},
				direction: {
					get: function() {
						return this._direction;
					},
					set: function(value) {
						this._direction = value;
						this.requestRender();
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGTriangle
				 */
				constructor: function SVGTriangle(graphics, element) {
					super_.constructor.call(this, graphics, element);
					this._topX = 0;
					this._topY = 0;
					this._width = 0;
					this._height = 0;
					this._direction = 'up';
				},
				render: function() {
					this._renderChangedAttributes();
					this._renderTriangle();
				},

				/**
				 * @private
				 */
				_renderTriangle: function() {
					var width = this.width;
					var height = this.height;

					// 三角形が大きさを持たない場合
					if (!width || !height) {
						this.removeAttribute('d', true);
						return;
					}

					var topX = this.topX;
					var topY = this.topY;
					var direction = this.direction;
					var d;
					if (typeof direction === 'number') {
						d = direction;
					} else {
						switch (direction) {
						case 'up':
							d = 0;
							break;

						case 'left':
							d = 90;
							break;

						case 'down':
							d = 180;
							break;

						case 'right':
							d = 270;
							break;

						default:
							d = 0;
						}
					}

					d = ((d + 270) % 360) * Math.PI / 180;

					// 頂点から底辺に直角に伸びる直線と底辺との交差点（底辺の中心）
					var x1 = topX + height * Math.cos(d + Math.PI);
					var y1 = topY + height * Math.sin(d + Math.PI);

					// 底辺の中心から底辺の頂点へのそれぞれの軸方向の差分
					var dx = width / 2 * Math.cos(d + Math.PI / 2);
					var dy = width / 2 * Math.sin(d + Math.PI / 2);

					var path = '';
					path += ' M' + (x1 + dx) + ',' + (y1 + dy);
					path += ' L' + (x1 - dx) + ',' + (y1 - dy);
					path += ' L' + topX + ',' + topY;
					path += ' Z';

					this._setAttribute('d', path, true);
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['stroke', 'stroke-width', 'fill']);
		return desc;
	});

	var SVGImage = SVGDrawElement.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGImage',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGImage
				 */
				constructor: function SVGImage(graphics, element) {
					super_.constructor.call(this, graphics, element);
				},
				render: function() {
					this._renderChangedAttributes();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x', 'y', 'width', 'height', 'preserveAspectRatio']);
		addSimpleXLinkAccessor(desc.accessor, ['href']);
		return desc;
	});

	var SVGPolyline = SVGDrawElement.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGPolyline',
			field: {
				_points: null
			},
			accessor: {
				points: {
					get: function() {
						return this._points;
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGPolyline
				 */
				constructor: function SVGPolyline(graphics, element) {
					super_.constructor.call(this, graphics, element);
					this._points = PointArray.create();
					this._points.addEventListener('pointArrayChanged', this._pointArrayChanged
							.bind(this));
				},
				render: function() {
					this._renderChangedAttributes();
					this._renderPolyline();
				},

				/**
				 * @private
				 */
				_renderPolyline: function() {
					this._setAttribute('points', this._points.join(' '), true);
				},

				/**
				 * @private
				 */
				_pointArrayChanged: function() {
					this.requestRender();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['stroke', 'stroke-width', 'fill']);
		return desc;
	});

	// polylineとpolygonは同じI/F
	var SVGPolygon = SVGPolyline.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGPolygon',
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGPolygon
				 */
				constructor: function SVGPolygon(graphics, element) {
					super_.constructor.call(this, graphics, element);
				}
			}
		};
		return desc;
	});

	SVGElementWrapper.extend(function(super_) {
		// TODO SVGDefinitionsに追加するWrapperはidプロパティを持つ必要がある
		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGDefinitions
			 */
			name: 'h5.ui.components.stage.SVGDefinitions',
			field: {
				_definitions: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGDefinitions
				 */
				constructor: function SVGDefinitions(element) {
					super_.constructor.call(this);
					this._element = element;
					this._definitions = new Map();
				},
				get: function(id) {
					return this._definitions.has(id) ? this._definitions.get(id) : null;
				},
				has: function(target) {
					var id = this._getId(target);
					return id === null ? false : this._definitions.get(id);
				},
				add: function(definition) {
					var id = this._getId(definition);
					if (id === null) {
						throw new Error('definitionは必ずidを持つ必要があります。');
						return;
					}

					this._definitions.set(id, definition);
					this._element.appendChild(definition._element);
				},
				remove: function(target) {
					var id = this._getId(target);
					if (id === null) {
						throw new Error('definitionは必ずidを持つ必要があります。');
						return;
					}

					var definition = this._definitions.get(id);
					if (!definition) {
						return;
					}
					this._element.removeChild(definition._element);
				},

				/**
				 * @private
				 */
				_getId: function(target) {
					if (typeof target === 'string') {
						return target;
					}
					var id = target.id;
					return id === undefined ? null : id;
				}
			}
		};
		return desc;
	});

	var SVGGradient = SVGElementWrapper.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGGradient',
			field: {
				_stops: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGGradient
				 */
				constructor: function SVGGradient(element, id) {
					super_.constructor.call(this, null, element, id);
					this._isDefinition = true;
					this._stops = [];
				},
				addStop: function(offset, color, opacity) {
					var stop = createSvgElement('stop');
					if (offset !== undefined) {
						setSvgAttribute(stop, 'offset', offset);
					}
					if (color !== undefined) {
						setSvgAttribute(stop, 'stop-color', color);
					}
					if (opacity !== undefined) {
						setSvgAttribute(stop, 'stop-opacity', opacity);
					}

					this._element.appendChild(stop);
					this._stops.push({
						element: stop,
						offset: offset,
						color: color,
						opacity: opacity
					});
					return this;
				}
			}
		};
		return desc;
	});

	var SVGLinearGradient = SVGGradient.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGLinearGradient',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGLinearGradient
				 */
				constructor: function SVGLinearGradient(element, id) {
					super_.constructor.call(this, element, id);
				},
				from: function(x1, y1) {
					this.x1 = x1;
					this.y1 = y1;
					return this;
				},
				to: function(x2, y2) {
					this.x2 = x2;
					this.y2 = y2;
					return this;
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['x1', 'y1', 'x2', 'y2', 'spreadMethod']);
		return desc;
	});

	var SVGRadialGradient = SVGGradient.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SVGRadialGradient',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGRadialGradient
				 */
				constructor: function SVGRadialGradient(element, id) {
					super_.constructor.call(this, element, id);
				},
				center: function(cx, cy) {
					this.cx = cx;
					this.cy = cy;
					return this;
				},
				radius: function(r) {
					this.r = r;
					return this;
				},
				focus: function(fx, fy) {
					this.fx = fx;
					this.fy = fy;
					return this;
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['cx', 'cy', 'r', 'fx', 'fy', 'spreadMethod']);
		return desc;
	});

	var SVGGraphics = RootClass.extend(function(super_) {
		//TODO 仮実装
		var idSequence = 0;

		var ID_SEQ_PREFIX = 'def_';

		//TODO 仮実装、連番一意ID生成
		function createDefId(view) {
			return ID_SEQ_PREFIX + view.rowIndex + '_' + view.columnIndex + '_' + idSequence++;
		}

		var desc = {
			name: 'h5.ui.components.stage.SVGGraphics',
			field: {
				_rootSvg: null,
				_defs: null,
				_renderWaitingList: null,
				_view: null
			},
			accessor: {
				isDirty: {
					get: function() {
						return this._renderWaitingList.length !== 0;
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGGraphics
				 */
				constructor: function SVGGraphics(view, rootSvg, rootDefs) {
					super_.constructor.call(this);
					this._rootSvg = rootSvg;
					this._defs = rootDefs;
					this._renderWaitingList = [];
					this._view = view;
				},

				/**
				 * @private
				 */
				_addDefinition: function(svgElementWrapper) {
					if (this._defs.has(svgElementWrapper)) {
						//TODO 同じIDを持つ要素が既にdefsにあったらエラーにする
						return;
					}

					this._defs.add(svgElementWrapper);
				},

				_removeDefinition: function(id) {
					this._defs.remove(id);
				},

				/**
				 * @private
				 */
				_addToRenderWaitingList: function(svgDrawElement) {
					if ($.inArray(svgDrawElement, this._renderWaitingList) === -1) {
						this._renderWaitingList.push(svgDrawElement);
					}
				},

				render: function() {
					var list = this._renderWaitingList;
					for (var i = 0, len = list.length; i < len; i++) {
						var drawElement = list[i];
						drawElement.render();
					}
					this._renderWaitingList = [];
				},

				getDefinition: function(id) {
					return this._defs.get(id);
				},

				createLinearGradient: function(id) {
					if (id === undefined) {
						id = createDefId(this._view);
					}

					var element = createSvgElement('linearGradient');
					var gradient = SVGLinearGradient.create(element, id);
					this._addDefinition(gradient);
					return gradient;
				},

				createRadialGradient: function(id) {
					if (id === undefined) {
						id = createDefId(this._view);
					}

					var element = createSvgElement('radialGradient');
					var gradient = SVGRadialGradient.create(element, id);
					this._addDefinition(gradient);
					return gradient;
				},

				clear: function() {
					//TODO clearもrender()のタイミングに遅延する？？

					while (this._rootSvg.firstChild) {
						this._rootSvg.removeChild(this._rootSvg.firstChild);
					}
					this._renderWaitingList = [];
					//TODO drawLineなどで作ったSVGDrawElementインスタンスから自分への参照を除去
				},

				drawImage: function() {
					var image = createSvgElement('image');
					this._rootSvg.appendChild(image);
					var de = SVGImage.create(this, image);
					return de;
				},

				drawLine: function() {
					var line = createSvgElement('line');
					this._rootSvg.appendChild(line);
					var sl = SVGLine.create(this, line);
					return sl;
				},
				drawRect: function() {
					var rect = createSvgElement('rect');
					this._rootSvg.appendChild(rect);
					var de = SVGRect.create(this, rect);
					return de;
				},
				drawCircle: function() {
					var circle = createSvgElement('circle');
					this._rootSvg.appendChild(circle);
					var de = SVGCircle.create(this, circle);
					return de;
				},
				drawText: function(str) {
					var text = createSvgElement('text');
					this._rootSvg.appendChild(text);
					var de = SVGText.create(this, text);

					if (str != null) {
						de.setText(str);
					}

					return de;
				},
				drawTriangle: function() {
					var path = createSvgElement('path');
					this._rootSvg.appendChild(path);
					var de = SVGTriangle.create(this, path);
					return de;
				},
				drawPolygon: function() {
					var polygon = createSvgElement('polygon');
					this._rootSvg.appendChild(polygon);
					var de = SVGPolygon.create(this, polygon);
					return de;
				},
				drawPolyline: function() {
					var polyline = createSvgElement('polyline');
					this._rootSvg.appendChild(polyline);
					var de = SVGPolyline.create(this, polyline);
					return de;
				}
			}
		};
		return desc;
	});

	//重複を許さないセット
	var SimpleSet = RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.SimpleSet',
			field: {
				_keys: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SimpleSet
				 */
				constructor: function SimpleSet() {
					super_.constructor.call(this);
					this._keys = [];
				},
				add: function(key) {
					if (this.has(key)) {
						return;
					}
					this._keys.push(key);
				},
				remove: function(key) {
					var idx = this._keys.indexOf(key);
					if (idx === -1) {
						//このタグは持っていない
						return;
					}
					this._keys.splice(idx, 1);
				},
				has: function(key) {
					return this._keys.indexOf(key) !== -1;
				},
				clear: function() {
					this._keys = [];
				},
				size: function() {
					return this._keys.length;
				},
				toArray: function() {
					return this._keys.slice(0);
				},
			}
		};
		return desc;
	});

	var PointArray = EventDispatcher.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.PointArray',
			field: {
				_points: null
			},
			accessor: {
				length: {
					get: function() {
						return this._points.length;
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.PointArray
				 */
				constructor: function() {
					super_.constructor.call(this);
					this._points = [];
				},
				add: function(x, y) {
					var point = SVGPoint.create(x, y);
					this._points.push(point);
					this._dispatchEvent();
				},
				remove: function(i) {
					this._points.splice(i, 1);
					this._dispatchEvent();
				},
				get: function(i) {
					return this._points[i];
				},
				set: function(i, x, y) {
					var point = SVGPoint.create(x, y);
					this._points.splice(i, 1, point);
					this._dispatchEvent();
				},
				indexOf: function(x, y) {
					for (var i = 0, len = this.length; i < len; i++) {
						var point = this._points[i];
						if (poinx.x === x && point.y === y) {
							return i;
						}
					}
					return -1;
				},
				join: function(connector) {
					return this._points.join(connector);
				},
				clear: function() {
					this._points.length = 0;
					this._dispatchEvent();
				},

				/**
				 * @private
				 */
				_dispatchEvent: function() {
					var event = Event.create('pointArrayChanged');
					this.dispatchEvent(event);
				}
			}
		};
		return desc;
	});

	var ERR_CANNOT_MOVE_OFFSTAGE_DU = 'Stageに追加されていないDisplayUnitはディスプレイ座標系に基づいた移動はできません。';

	//TODO layouter(仮)を差し込めるようにし、
	//layouterがいる場合にはx,y,w,hをセットしようとしたときに
	//layouterがフックして強制ブロック・別の値をセット等できるようにする
	var DisplayUnit = EventDispatcher
			.extend(function(super_) {
				var duIdSequence = 0;

				var classDesc = {
					name: 'h5.ui.components.stage.DisplayUnit',
					isAbstract: true,
					field: {
						id: null,
						extraData: null,

						_x: null,
						_y: null,

						_zIndex: null,

						_width: null,
						_height: null,

						_parentDU: null,

						_rootStage: null,

						_groupTag: null,

						_isVisible: null,

						_isSystemVisible: null,

						_isForceHidden: null,

						_belongingLayer: null,

						/**
						 * この要素を現在選択可能かどうか
						 */
						_isSelectable: null,

						_isSelected: null,
						_isFocused: null,

						_worldGlobalPositionCache: null
					},
					accessor: {
						x: {
							get: function() {
								return this._x;
							},
							set: function(value) {
								if (value === this._x) {
									return;
								}
								this._x = value;
								this._worldGlobalPositionCache = null;

								this._setDirty(REASON_POSITION_CHANGE);
							}
						},
						y: {
							get: function() {
								return this._y;
							},
							set: function(value) {
								if (value === this._y) {
									return;
								}
								this._y = value;
								this._worldGlobalPositionCache = null;

								this._setDirty(REASON_POSITION_CHANGE);
							}
						},

						zIndex: {
							get: function() {
								return this._zIndex;
							},
							set: function(value) {
								if (value === this._zIndex) {
									return;
								}
								var oldValue = this._zIndex;
								this._zIndex = value;

								var dirtyReason = {
									type: REASON_Z_INDEX_CHANGE,
									oldValue: oldValue,
									newValue: value
								};
								this._setDirty(dirtyReason);
							}
						},

						width: {
							get: function() {
								return this._width;
							},
							set: function(value) {
								if (value === this._width) {
									return;
								}
								this._width = value;

								this._setDirty(REASON_SIZE_CHANGE);
							}
						},
						height: {
							get: function() {
								return this._height;
							},
							set: function(value) {
								if (value === this._height) {
									return;
								}
								this._height = value;

								this._setDirty(REASON_SIZE_CHANGE);
							}
						},
						groupTag: {
							get: function() {
								return this._groupTag;
							}
						},
						parentDisplayUnit: {
							get: function() {
								return this._parentDU;
							}
						},
						//TODO isVisibleがfalseになったら、DOMごと消す。
						//コンテナの場合、子孫要素のisVisibleに関わらず、コンテナ自身と子孫全てを非表示にする。
						isVisible: {
							get: function() {
								return this._isVisible;
							},
							set: function(value) {
								if (value === this._isVisible) {
									return;
								}
								this._isVisible = value;
								this._setDirty(REASON_VISIBILITY_CHANGE);
							}
						},

						isSelectable: {
							get: function() {
								return this._isSelectable;
							},
							set: function(value) {
								if (this._isSelectable === value) {
									return;
								}
								this._isSelectable = value;
								if (value === false) {
									//選択不能になったので、選択状態を解除
									this.unselect();
								}
							}
						},

						isSelected: {
							get: function() {
								return this._isSelected;
							}
						},

						isFocused: {
							get: function() {
								return this._isFocused;
							}
						}
					},
					method: {
						/**
						 * @memberOf h5.ui.components.stage.DisplayUnit
						 */
						constructor: function DisplayUnit(id) {
							super_.constructor.call(this);
							//TODO 引数のIDは必須にする？？
							if (id == null) {
								//TODO ただの連番でなくGUID等にする
								this.id = 'duid_' + duIdSequence;
								duIdSequence++;
							} else {
								//TODO IDが渡された場合は一意性チェックを入れたい(※ここではなく、StageにaddされるときにStage側が行う)
								this.id = id;
							}

							this._isSelectable = true;
							this._isSelected = false;
							this._isFocused = false;

							//コンストラクタではバッキングストアを直接初期化するが、
							//他の場所では必ずアクセサ経由で呼び出すこと。
							//子クラスにて位置やサイズが変わった場合に
							//再レンダリングなどを起こすフックが含まれる場合があるため。
							this._x = 0;
							this._y = 0;
							this._zIndex = 0;
							this._width = 0;
							this._height = 0;

							this._isVisible = true;

							this._isSystemVisible = true;

							this._isForceHidden = false;

							this._groupTag = SimpleSet.create();

							this._belongingLayer = null;
						},

						setRect: function(rect) {
							var isSizeChanged = false;
							var isPositionChanged = false;

							if (this._x !== rect.x) {
								this._x = rect.x;
								isPositionChanged = true;
							}

							if (this._y !== rect.y) {
								this._y = rect.y;
								isPositionChanged = true;
							}

							if (this._width !== rect.width) {
								this._width = rect.width;
								isSizeChanged = true;
							}

							if (this._height !== rect.height) {
								this._height = rect.height;
								isSizeChanged = true;
							}

							var reasons = [];
							if (isPositionChanged) {
								reasons.push(REASON_POSITION_CHANGE);
								this._worldGlobalPositionCache = null;
							}
							if (isSizeChanged) {
								reasons.push(REASON_SIZE_CHANGE);
							}

							this._setDirty(reasons);
						},

						getRect: function() {
							var rect = Rect.create(this.x, this.y, this.width, this.height);
							return rect;
						},

						setSize: function(width, height) {
							var isSizeChanged = false;

							if (this._width !== width) {
								this._width = width;
								isSizeChanged = true;
							}

							if (this._height !== height) {
								this._height = height;
								isSizeChanged = true;
							}

							if (isSizeChanged) {
								//実際にサイズが変更された場合に限りdirtyにする
								this._setDirty(REASON_SIZE_CHANGE);
							}
						},

						remove: function() {
							if (this._parentDU) {
								this._parentDU.removeDisplayUnit(this);
							}
						},

						moveTo: function(worldX, worldY) {
							var isPositionChanged = false;

							if (this._x !== worldX) {
								this._x = worldX;
								isPositionChanged = true;
							}

							if (this._y !== worldY) {
								this._y = worldY;
								isPositionChanged = true;
							}

							if (isPositionChanged) {
								this._worldGlobalPositionCache = null;
								this._setDirty(REASON_POSITION_CHANGE);
							}
						},

						moveBy: function(worldDx, worldDy) {
							if (worldDx === 0 && worldDy === 0) {
								//差分なので、移動量がどちらも0なら何もしない
								return;
							}

							this._x += worldDx;
							this._y += worldDy;
							this._worldGlobalPositionCache = null;
							this._setDirty(REASON_POSITION_CHANGE);
						},

						moveDisplayTo: function(x, y) {
							if (!this._rootStage) {
								throw new Error(ERR_CANNOT_MOVE_OFFSTAGE_DU);
							}
							var view = this._rootStage._getActiveView();
							//TODO 現状DUはどのViewでも同じ位置になるので、アクティブビューのものを使用すればよい
							var worldPos = view._viewport.getWorldPosition(x, y);
							this.moveTo(worldPos.x, worldPos.y);
						},

						moveDisplayBy: function(x, y) {
							if (!this._rootStage) {
								throw new Error(ERR_CANNOT_MOVE_OFFSTAGE_DU);
							}

							if (x === 0 && y === 0) {
								return;
							}

							var view = this._rootStage._getActiveView();
							var wx = view._viewport.toWorldX(x);
							var wy = view._viewport.toWorldY(y);
							this.moveBy(wx, wy);
						},

						/**
						 * このDUが可視範囲に入るように、ステージをスクロールします。<br>
						 * "center"を指定した場合、このDisplayUnitが画面の中央に来るようにスクロールします。
						 * (ステージにスクロール制限がかけられている場合、中央に来ない場合があります。)<br>
						 * 引数なしの場合、このDUが「ちょうど見える」ようにスクロールします。DUがすでに可視範囲にすべて入っている場合はスクロールしません。
						 */
						scrollIntoView: function(mode, view) {
							//TODO 引数に位置を取れるようにする？
							//TODO BasicDUに持たせる？ContentsDU?
							if (!this._rootStage) {
								return;
							}

							if (!view) {
								view = this._rootStage._getActiveView();
							}

							var gpos = this.getWorldGlobalPosition();
							var wr = view._viewport.getWorldRect();
							var moveDx = 0;
							var moveDy = 0;

							if (mode == 'center') {
								//centerモード
								var cx = gpos.x + this.width / 2;
								var cy = gpos.y + this.height / 2;
								moveDx = cx - wr.x - wr.width / 2;
								moveDy = cy - wr.y - wr.height / 2;
								view.scrollWorldBy(moveDx, moveDy);
								return;
							}

							//glanceモード
							if (gpos.x < wr.x) {
								moveDx = gpos.x - wr.x;
							} else if (gpos.x + this.width > wr.x + wr.width) {
								moveDx = gpos.x + this.width - (wr.x + wr.width);
							}

							if (gpos.y < wr.y) {
								moveDy = gpos.y - wr.y;
							} else if (gpos.y + this.height > wr.y + wr.height) {
								moveDy = gpos.y + this.height - (wr.y + wr.height);
							}
							view.scrollWorldBy(moveDx, moveDy);
						},

						getWorldGlobalPosition: function() {
							if (!this._parentDU) {
								return null;
							}

							if (this._worldGlobalPositionCache) {
								return this._worldGlobalPositionCache;
							}

							var wgx = this.x;
							var wgy = this.y;

							var parentDU = this._parentDU;
							while (!Layer.isClassOf(parentDU)) {
								wgx += parentDU.x;
								wgy += parentDU.y;
								parentDU = this._parentDU._parentDU;
							}

							this._worldGlobalPositionCache = WorldPoint.create(wgx, wgy);
							return this._worldGlobalPositionCache;
						},

						select: function(isExclusive) {
							if (!this._rootStage) {
								return;
							}

							if (!this._isSelectable) {
								//TODO ログを出すべきか
								return;
							}

							this._rootStage.select(this, isExclusive);
						},

						unselect: function() {
							if (!this._rootStage) {
								return;
							}
							this._rootStage.unselect(this);
						},

						focus: function() {
							if (!this._rootStage) {
								return;
							}

							if (!this._isSelectable) {
								return;
							}

							this._rootStage.focus(this);
						},

						unfocus: function(andUnselect) {
							if (!this._rootStage) {
								return;
							}
							this._rootStage.unfocus(andUnselect);
						},

						/**
						 * @private
						 */
						_setDirty: function(reasons) {
							if (!reasons) {
								throw new Error('_setDirty()時は引数のリーズンは必須です。');
							}

							this.__onDirtyNotify(this, reasons);

							var event = DisplayUnitDirtyEvent.create();
							event.displayUnit = this;
							event.reason = UpdateReasonSet.create(reasons);
							this.dispatchEvent(event);
						},

						/**
						 * @private
						 */
						_onAddedToStage: function(stage, belongingLayer) {
							this._rootStage = stage;
							this._belongingLayer = belongingLayer;

							var event = Event.create('addToStage');
							this.dispatchEvent(event);
						},

						/**
						 * @private
						 */
						_onRemovedFromStage: function() {
							this._rootStage = null;
							this._belongingLayer = null;

							var event = Event.create('removeFromStage');
							this.dispatchEvent(event);
						},

						/**
						 * @private
						 */
						_updateActualDisplayStyle: function(element) {
							//MEMO: 個別要素にdisplay:noneを設定するよりも、
							//表示非表示の制御を完全にブラウザに任せる（＝displayの制御をまったくしない）方が高速だった。
							//（制御をしないようにすることで、displayの制御によるブラウザ自体のツリー計算や
							//レンダリングが最適化されるのに加え、
							//「可視範囲に入っているかどうか」の計算自体が省略できる（これが結構大きい）。
							//ただし、初期表示時は制御した方が多少速い。
							//また、IEでは初期表示の速度低下が激しいが、これを改善するためには
							//DOMツリー自体を小さくする（DOMの生成を表示範囲のみにしてappend/removeを動的に行う）が
							//必要と思われる。

							var isElementDisplayVisible = window.getComputedStyle(element, '').display !== 'none';

							//ドラッグ中など、元のDUを強制的にすることがある。
							//（ドラッグ中の場合はViewCollectionがドラッグ対象とされたDUにたいしてこのisForceHiddenを設定する）
							//ユーザーが設定したisVisibleを変更しないようにしている。
							var desiredVisible = this._isForceHidden ? false : this._isVisible;

							if (isElementDisplayVisible !== desiredVisible) {
								//現時点では、単純にユーザーによる表示制御だけを行う
								element.style.display = desiredVisible ? '' : 'none';
							}

							//forceHiddenがtrueの場合は必ずdipslay:noneにする
							//							var desiredVisible = this._isForceHidden ? false : this._isVisible
							//									&& this._isSystemVisible;

							//							var isElementDisplayVisible = element.classList.contains('h5-stage-invisible-du');

							//							if (desiredVisible !== isElementDisplayVisible) {
							//								if(desiredVisible) {
							//									element.classList.remove('h5-stage-invisible-du');
							//}
							//								else {
							//									element.classList.add('h5-stage-invisible-du');
							//}
							//element.style.display = desiredVisible ? '' : 'none';
							//							}
						},

						/**
						 * @private
						 */
						__updateDOM: function(stageView, element, reason) {
							if (reason.isInitialRender || reason.isVisibilityChanged) {
								this._updateActualDisplayStyle(element);
							}

							if (reason.isInitialRender || reason.isPositionChanged) {
								setSvgAttributes(element, {
									x: this.x,
									y: this.y
								});
							}

							if (reason.isInitialRender || reason.isSizeChanged) {
								setSvgAttributes(element, {
									width: this.width,
									height: this.height
								});
							}
						},

						/**
						 * @private
						 */
						__renderDOM: function(view) {
							throw new Error('__renderDOMは子クラスでオーバーライドする必要があります。');
						},

						/**
						 * 子孫の要素がdirtyになった場合に子→親に向かって呼び出されるコールバック
						 *
						 * @private
						 * @param du
						 */
						__onDirtyNotify: function(du, reasons) {
							if (this._parentDU) {
								this._parentDU.__onDirtyNotify(du, reasons);
							}
						},

						/**
						 * 直接の親要素がdirtyになった場合に親→子に向かって呼び出されるコールバック
						 *
						 * @private
						 */
						__onParentDirtyNotify: function(du, reasons) {
							if (!this._willGlobalPositionChangeByParentDirty(reasons)) {
								return;
							}
							this._worldGlobalPositionCache = null;
							this._setDirty(REASON_GLOBAL_POSITION_CHANGE);
						},

						/**
						 * @private
						 */
						_willGlobalPositionChangeByParentDirty: function(reasons) {
							if (!Array.isArray(reasons)) {
								reasons = [reasons];
							}

							if (reasons.indexOf(REASON_POSITION_CHANGE) !== -1
									|| reasons.indexOf(REASON_SCROLL_POSITION_CHANGE) !== -1
									|| reasons.indexOf(REASON_SCALE_CHANGE) !== -1) {
								return true;
							}
							return false;
						},

						/**
						 * @private
						 */
						_setSystemVisible: function(value, element) {
							this._isSystemVisible = value;

							if (element) {
								this._updateActualDisplayStyle(element);
							}
						}
					}
				};

				return classDesc;
			});


	var UpdateReasonSet = RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.UpdateReasonSet',

			field: {
				_reasonMap: null
			},

			accessor: {

				isSizeChanged: {
					get: function() {
						return this.has(REASON_SIZE_CHANGE);
					}
				},

				isPositionChanged: {
					get: function() {
						return this.has(REASON_POSITION_CHANGE);
					}
				},

				isGlobalPositionChanged: {
					get: function() {
						return this.has(REASON_GLOBAL_POSITION_CHANGE);
					}
				},

				isRenderRequested: {
					get: function() {
						return this.has(REASON_RENDER_REQUEST);
					}
				},

				isVisibilityChanged: {
					get: function() {
						return this.has(REASON_VISIBILITY_CHANGE);
					}
				},

				isZIndexChanged: {
					get: function() {
						return this.has(REASON_Z_INDEX_CHANGE);
					}
				},

				isScaleChanged: {
					get: function() {
						return this.has(REASON_SCALE_CHANGE);
					}
				},

				isInitialRender: {
					get: function() {
						return this.has(REASON_INITIAL_RENDER);
					}
				},

				isSelectionChanged: {
					get: function() {
						return this.has(REASON_SELECTION_CHANGE);
					}
				},

				isFocusChanged: {
					get: function() {
						return this.has(REASON_FOCUS_CHANGE);
					}
				}
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.UpdateReasonSet
				 */
				constructor: function UpdateReasonSet(reasons) {
					super_.constructor.call(this);
					this._reasonMap = {};

					this._add(reasons);
				},

				has: function(type) {
					return (type in this._reasonMap);
				},

				get: function(type) {
					return this._reasonMap[type];
				},

				getAll: function() {
					var ret = [];
					var that = this;
					Object.keys(this._reasonMap).forEach(function(key) {
						ret.push(that._reasonMap[key]);
					});
					return ret;
				},

				merge: function(updateReasonSet) {
					if (!updateReasonSet || updateReasonSet === this) {
						return;
					}

					var reasons = updateReasonSet.getAll();
					this._add(reasons);
				},

				/**
				 * アップデート理由を追加します。UpdateReasonは 最低限typeを持つ（オブジェクトの場合）、または文字列のみでもよいです。
				 * 既に同じtypeのReasonがあった場合は上書きします。
				 *
				 * @private
				 */
				_add: function(reasons) {
					if (!Array.isArray(reasons)) {
						reasons = [reasons];
					}

					var that = this;

					reasons.forEach(function(r) {
						//既に同じtypeのReasonがあった場合は上書き

						if (typeof r === 'string') {
							that._reasonMap[r] = {
								type: r
							};
						} else {
							if (r.type == null) {
								throw new Error('アップデート理由オブジェクトにtypeがありません。typeは必須です。');
							}
							that._reasonMap[r.type] = r;
						}
					});
				}
			}
		};
		return desc;
	});

	var BasicDisplayUnit = DisplayUnit.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.BasicDisplayUnit',
			field: {
				/**
				 * この要素を現在ドラッグ可能かどうか
				 */
				isDraggable: null,

				/**
				 * 現在この要素をドラッグ中かどうか。
				 */
				_isDragging: null,

				_renderer: null,
			},
			accessor: {
				width: {
					get: function() {
						return super_.width.get.call(this);
					},
					set: function(value) {
						super_.width.set.call(this, value);
					}
				},
				height: {
					get: function() {
						return super_.height.get.call(this);
					},
					set: function(value) {
						super_.height.set.call(this, value);
					}
				},
				isDragging: {
					get: function() {
						return this._isDragging;
					}
				}
			},
			method: {
				constructor: function BasicDisplayUnit(id) {
					super_.constructor.call(this, id);

					this.isDraggable = true;
					this._isDragging = false;
				},
				/**
				 * rendererのシグネチャ：function(graphics, du)
				 *
				 * @memberOf h5.ui.components.stage.BasicDisplayUnit
				 */
				setRenderer: function(renderer) {
					if (this._renderer === renderer) {
						return;
					}
					this._renderer = renderer;
					if (renderer != null) {
						//レンダラが変更かつセットされたら再描画
						this.requestRender();
					}
				},

				requestRender: function() {
					if (!this._rootStage) {
						return;
					}

					this._setDirty(REASON_RENDER_REQUEST);
				},

				/**
				 * @private
				 */
				__createGraphics: function(view, svgElement) {
					var graphics = this._belongingLayer.__createGraphics(view, svgElement);
					return graphics;
				},

				/**
				 * @private
				 * @overrides オーバーライド
				 */
				__renderDOM: function(view) {
					var root = createSvgElement('svg');
					root.setAttribute('data-h5-dyn-stage-role', 'basicDU'); //TODO for debugging
					root.setAttribute('data-h5-dyn-du-id', this.id);

					var reason = UpdateReasonSet.create(REASON_INITIAL_RENDER);

					this.__updateDOM(view, root, reason);
					return root;
				},

				/**
				 * @private
				 */
				__updateDOM: function(view, element, reason) {
					super_.__updateDOM.call(this, view, element, reason);
					this._update(view, element, reason);
				},

				/**
				 * @private
				 */
				_update: function(view, root, reason) {
					if (!this._renderer) {
						//レンダラがセットされていない場合は空の要素を返す
						return;
					}

					var context = {
						view: view,
						displayUnit: this,
						rootElement: root,
						reason: reason
					};

					var graphics = this.__createGraphics(view, root);

					this._renderer(context, graphics);

					if (graphics.isDirty) {
						graphics.render();
					}
				}
			}
		};
		return desc;
	});

	var DisplayUnitCascadeRemovingEvent = Event.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.DisplayUnitCascadeRemovingEvent',

			field: {
				_targetDisplayUnit: null,
				_relatedDisplayUnit: null
			},

			accessor: {
				targetDisplayUnit: {
					get: function() {
						return this._targetDisplayUnit;
					}
				},
				relatedDisplayUnit: {
					get: function() {
						return this._relatedDisplayUnit;
					}
				}
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayUnitCascadeRemovingEvent
				 */
				constructor: function DisplayUnitCascadeRemovingEvent(targetDisplayUnit,
						relatedDisplayUnit) {
					super_.constructor.call(this, 'duCascadeRemoving');
					this._targetDisplayUnit = targetDisplayUnit;
					this._relatedDisplayUnit = relatedDisplayUnit;
				}
			}
		};
		return desc;
	});

	//TODO Path <- Edge などとする
	//TODO DUからrect系をはずすか
	var Edge = DisplayUnit
			.extend(function(super_) {
				var ERR_CANNOT_USE_UPDATE_POS_SIZE_METHOD = 'Edgeでは位置やサイズを直接変更するメソッドは使えません';

				var desc = {
					name: 'h5.ui.components.stage.Edge',
					field: {
						_from: null,
						_to: null,
						_endpointFrom: null,
						_endpointTo: null,

						_duDirtyHandler: null,
						_duRemoveFromStageHandler: null,

						_classSet: null,

						_endpoint_propertyChangeListener: null,

						_isUpdateLinePositionRequired: null,

						_x1: null,
						_x2: null,
						_y1: null,
						_y2: null
					},

					accessor: {
						x: {
							get: function() {
								this._updateLinePosition();
								return super_.x.get.call(this);
							},
							set: function(value) {
								throw new Error('Edgeのxは直接設定できません。');
							}
						},

						y: {
							get: function() {
								this._updateLinePosition();
								return super_.y.get.call(this);
							},
							set: function(value) {
								throw new Error('Edgeのyは直接設定できません。');
							}
						},

						width: {
							get: function() {
								this._updateLinePosition();
								return super_.width.get.call(this);
							},
							set: function(value) {
								throw new Error('Edgeのwidthは直接設定できません。');
							}
						},

						height: {
							get: function() {
								this._updateLinePosition();
								return super_.height.get.call(this);
							},
							set: function(value) {
								throw new Error('Edgeのheightは直接設定できません。');
							}
						},

						endpointFrom: {
							get: function() {
								return this._endpointFrom;
							}
						},
						endpointTo: {
							get: function() {
								return this._endpointTo;
							}
						}
					},

					method: {
						/**
						 * @memberOf h5.ui.components.stage.Edge
						 */
						constructor: function Edge(duFrom, duTo) {
							super_.constructor.call(this);
							this._from = duFrom;
							this._to = duTo;

							//初期状態。_updateLinePosition()により更新され、
							//線分をちょうど包含するサイズになる
							this._width = 1;
							this._height = 1;

							this._classSet = SimpleSet.create();

							this._endpointFrom = EdgeEndpoint.create();
							this._endpointTo = EdgeEndpoint.create();

							this._isUpdateLinePositionRequired = true;

							var that = this;

							this._duDirtyHandler = function(event) {
								var reason = event.reason;

								if (reason.isPositionChanged || reason.isSizeChanged
										|| reason.isGlobalPositionChanged) {
									that.requestRender();
								}
							};

							this._duRemoveFromStageHandler = function(event) {
								that._notifyCascadeRemove(event.target);
							};

							this._endpoint_propertyChangeListener = function(event) {
								that.requestRender();
							};
						},

						/**
						 * Edgeの位置・大きさはfrom,toのDisplayUnitとendpointの指定によって決まります。
						 * そのため、位置や大きさを変更するメソッドは使用できません。
						 *
						 * @override
						 */
						setRect: function() {
							throw new Error(ERR_CANNOT_USE_UPDATE_POS_SIZE_METHOD);
						},

						/**
						 * Edgeの位置・大きさはfrom,toのDisplayUnitとendpointの指定によって決まります。
						 * そのため、位置や大きさを変更するメソッドは使用できません。
						 *
						 * @override
						 */
						setSize: function() {
							throw new Error(ERR_CANNOT_USE_UPDATE_POS_SIZE_METHOD);
						},

						/**
						 * Edgeの位置・大きさはfrom,toのDisplayUnitとendpointの指定によって決まります。
						 * そのため、位置や大きさを変更するメソッドは使用できません。
						 *
						 * @override
						 */
						moveBy: function() {
							throw new Error(ERR_CANNOT_USE_UPDATE_POS_SIZE_METHOD);
						},

						/**
						 * Edgeの位置・大きさはfrom,toのDisplayUnitとendpointの指定によって決まります。
						 * そのため、位置や大きさを変更するメソッドは使用できません。
						 *
						 * @override
						 */
						moveDisplayBy: function() {
							throw new Error(ERR_CANNOT_USE_UPDATE_POS_SIZE_METHOD);
						},

						/**
						 * Edgeの位置・大きさはfrom,toのDisplayUnitとendpointの指定によって決まります。
						 * そのため、位置や大きさを変更するメソッドは使用できません。
						 *
						 * @override
						 */
						moveTo: function() {
							throw new Error(ERR_CANNOT_USE_UPDATE_POS_SIZE_METHOD);
						},

						/**
						 * Edgeの位置・大きさはfrom,toのDisplayUnitとendpointの指定によって決まります。
						 * そのため、位置や大きさを変更するメソッドは使用できません。
						 *
						 * @override
						 */
						moveDisplayTo: function() {
							throw new Error(ERR_CANNOT_USE_UPDATE_POS_SIZE_METHOD);
						},

						/**
						 * 線の端点の位置を再計算します。このメソッドを呼び出すとx,y,width,heightが更新されます。
						 * _isUpdateLinePositionRequiredがfalseの場合は何もしません。
						 *
						 * @private
						 */
						_updateLinePosition: function() {
							if (!this._isUpdateLinePositionRequired) {
								//位置の更新の必要がない状態で呼ばれたときは何もしない
								return;
							}
							this._isUpdateLinePositionRequired = false;

							var fwPos = this._from.getWorldGlobalPosition();
							var twPos = this._to.getWorldGlobalPosition();

							if (!fwPos || !twPos) {
								//from,toどちらかのDUがStageから削除されていて
								//グローバルポジションが取得できない場合は更新しない
								return;
							}

							var fromW = this._from.width;
							var fromH = this._from.height;
							var toW = this._to.width;
							var toH = this._to.height;

							var fromHAlign = this.endpointFrom.junctionHorizontalAlign;
							var toHAlign = this.endpointTo.junctionHorizontalAlign;

							var fromVAlign = this.endpointFrom.junctionVerticalAlign;
							var toVAlign = this.endpointTo.junctionVerticalAlign;

							var x1, y1, x2, y2;

							switch (fromHAlign) {
							case 'left':
								x1 = fwPos.x;
								break;
							case 'right':
								x1 = fwPos.x + fromW;
								break;
							case 'offset':
								x1 = fwPos.x + this.endpointFrom.junctionOffsetX;
								break;
							case 'nearest':
								var fwCenterX = fwPos.x + fromW / 2;
								var twCenterX = twPos.x + toW / 2;
								if (twCenterX - fwCenterX > 0) {
									//Toノードの中心がFromノードの中心より右にある＝Fromノード側はright相当にする
									x1 = fwPos.x + fromW;
								} else {
									x1 = fwPos.x;
								}
								break;
							case 'center':
							default:
								x1 = fwPos.x + fromW / 2;
								break;
							}

							switch (toHAlign) {
							case 'left':
								x2 = twPos.x;
								break;
							case 'right':
								x2 = twPos.x + toW;
								break;
							case 'offset':
								x2 = twPos.x + this.endpointTo.junctionOffsetX;
								break;
							case 'nearest':
								var fwCenterX = fwPos.x + fromW / 2;
								var twCenterX = twPos.x + toW / 2;
								if (twCenterX - fwCenterX > 0) {
									//Toノードの中心がFromノードの中心より右にある＝Toノード側はleft相当にする
									x2 = twPos.x;
								} else {
									x2 = twPos.x + toW;
								}
								break;
							case 'center':
							default:
								x2 = twPos.x + toW / 2;
								break;
							}

							switch (fromVAlign) {
							case 'top':
								y1 = fwPos.y;
								break;
							case 'bottom':
								y1 = fwPos.y + fromH;
								break;
							case 'offset':
								y1 = fwPos.y + this.endpointFrom.junctionOffsetY;
								break;
							case 'nearest':
								var fwCenterY = fwPos.y + fromH / 2;
								var twCenterY = twPos.y + toH / 2;
								if (twCenterY - fwCenterY > 0) {
									//Toノードの中心がFromノードの中心より下にある＝Fromノード側はbottom相当にする
									y1 = fwPos.y + fromH;
								} else {
									y1 = fwPos.y;
								}
								break;
							case 'middle':
							default:
								y1 = fwPos.y + fromH / 2;
								break;
							}

							switch (toVAlign) {
							case 'top':
								y2 = twPos.y;
								break;
							case 'bottom':
								y2 = twPos.y + toH;
								break;
							case 'offset':
								y2 = twPos.y + this.endpointTo.junctionOffsetY;
								break;
							case 'nearest':
								var fwCenterY = fwPos.y + fromH / 2;
								var twCenterY = twPos.y + toH / 2;
								if (twCenterY - fwCenterY > 0) {
									//Toノードの中心がFromノードの中心より下にある＝Toノード側はtop相当にする
									y2 = twPos.y;
								} else {
									y2 = twPos.y + toH;
								}
								break;
							case 'middle':
							default:
								y2 = twPos.y + toH / 2;
								break;
							}

							this._x1 = x1;
							this._x2 = x2;
							this._y1 = y1;
							this._y2 = y2;

							//EdgeDUのサイズをアップデート
							var left = x1 <= x2 ? x1 : x2;
							var top = y1 <= y2 ? y1 : y2;
							this._x = left;
							this._y = top;
							this._width = Math.abs(x2 - x1);
							this._height = Math.abs(y2 - y1);
						},

						hasClass: function(cssClass) {
							return this._classSet.has(cssClass);
						},

						addClass: function(cssClass) {
							this._classSet.add(cssClass);
							this.requestRender();
						},

						removeClass: function(cssClass) {
							this._classSet.remove(cssClass);
							this.requestRender();
						},

						clearClass: function() {
							this._classSet.clear();
							this.requestRender();
						},

						getClassSet: function() {
							return this._classSet;
						},

						requestRender: function() {
							if (!this._rootStage) {
								return;
							}

							this._isUpdateLinePositionRequired = true;
							this._setDirty(REASON_RENDER_REQUEST);
						},

						/**
						 * @private
						 * @param stage
						 * @param belongingLayer
						 */
						_onAddedToStage: function(stage, belongingLayer) {
							super_._onAddedToStage.call(this, stage, belongingLayer);

							this._from.addEventListener('displayUnitDirty', this._duDirtyHandler);
							this._to.addEventListener('displayUnitDirty', this._duDirtyHandler);

							this._from.addEventListener('removeFromStage',
									this._duRemoveFromStageHandler);
							this._to.addEventListener('removeFromStage',
									this._duRemoveFromStageHandler);

							this._endpointFrom.addEventListener('propertyChange',
									this._endpoint_propertyChangeListener);
							this._endpointTo.addEventListener('propertyChange',
									this._endpoint_propertyChangeListener);

							this._isUpdateLinePositionRequired = true;
						},

						/**
						 * @private
						 */
						_onRemovedFromStage: function() {
							super_._onRemovedFromStage.call(this);

							this._from
									.removeEventListener('displayUnitDirty', this._duDirtyHandler);
							this._to.removeEventListener('displayUnitDirty', this._duDirtyHandler);

							this._from.removeEventListener('removeFromStage',
									this._duRemoveFromStageHandler);
							this._to.removeEventListener('removeFromStage',
									this._duRemoveFromStageHandler);

							this._endpointFrom.removeEventListener('propertyChange',
									this._endpoint_propertyChangeListener);
							this._endpointTo.removeEventListener('propertyChange',
									this._endpoint_propertyChangeListener);
						},

						/**
						 * @private
						 */
						_onRemoving: function() {
							this._from
									.removeEventListener('displayUnitDirty', this._duDirtyHandler);
							this._to.removeEventListener('displayUnitDirty', this._duDirtyHandler);

							this._from.removeEventListener('removeFromStage',
									this._duRemoveFromStageHandler);
							this._to.removeEventListener('removeFromStage',
									this._duRemoveFromStageHandler);
						},

						/**
						 * @private
						 * @param view
						 * @returns
						 */
						__renderDOM: function(view) {
							var rootSvg = createSvgElement('line');
							rootSvg.setAttribute('data-stage-role', 'edge'); //TODO for debugging
							rootSvg.setAttribute('data-h5-dyn-du-id', this.id); //TODO for debugging

							var reason = UpdateReasonSet.create(REASON_INITIAL_RENDER);

							this.__updateDOM(view, rootSvg, reason);

							return rootSvg;
						},

						/**
						 * @private
						 * @param view
						 * @param line
						 * @param reason
						 */
						__updateDOM: function(view, line, reason) {
							if (reason.isInitialRender || reason.isVisibilityChanged) {
								line.style.display = this._isVisible && this._isSystemVisible ? ''
										: 'none';
							}

							if (!reason.isInitialRender && !reason.isRenderRequested
									&& !reason.isPositionChanged) {
								return;
							}

							this._updateLinePosition();

							//Edgeの場合、自身が最初のrender時に返しているのは<line>なので、
							//Update時に渡されるelementはline要素である
							line.className.baseVal = this.getClassSet().toArray().join(' ');

							setSvgAttributes(line, {
								x1: this._x1,
								y1: this._y1,
								x2: this._x2,
								y2: this._y2
							});
						},

						/**
						 * @private
						 * @param relatedDU
						 */
						_notifyCascadeRemove: function(relatedDU) {
							if (!this._belongingLayer) {
								return;
							}

							var isRemovePrevented = this._belongingLayer.__onCascadeRemoving(this,
									relatedDU);

							if (!isRemovePrevented) {
								this.remove();
							}
						}
					}
				};
				return desc;
			});

	var EdgeEndpoint = EventDispatcher.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.EdgeEndpoint',

			field: {
				_junctionVerticalAlign: null,
				_junctionHorizontalAlign: null,
				_junctionOffsetX: null,
				_junctionOffsetY: null
			},

			accessor: {
				//top, middle, bottom, offset, nearest, null
				junctionVerticalAlign: {
					get: function() {
						return this._junctionVerticalAlign;
					},
					set: function(value) {
						var oldValue = this._junctionVerticalAlign;

						if (value === oldValue) {
							return;
						}

						this._junctionVerticalAlign = value;

						var ev = PropertyChangeEvent.create('junctionVerticalAlign', oldValue,
								value);
						this.dispatchEvent(ev);
					}
				},

				//left, center, right, offset, nearest, null
				junctionHorizontalAlign: {
					get: function() {
						return this._junctionHorizontalAlign;
					},
					set: function(value) {
						var oldValue = this._junctionHorizontalAlign;

						if (value === oldValue) {
							return;
						}

						this._junctionHorizontalAlign = value;

						var ev = PropertyChangeEvent.create('junctionHorizontalAlign', oldValue,
								value);
						this.dispatchEvent(ev);
					}
				},

				//Alignがoffsetの場合のみ有効
				junctionOffsetX: {
					get: function() {
						return this._junctionOffsetX;
					},
					set: function(value) {
						var oldValue = this._junctionOffsetX;

						if (value === oldValue) {
							return;
						}

						this._junctionOffsetX = value;

						var ev = PropertyChangeEvent.create('junctionOffsetX', oldValue, value);
						this.dispatchEvent(ev);
					}
				},
				junctionOffsetY: {
					get: function() {
						return this._junctionOffsetY;
					},
					set: function(value) {
						var oldValue = this._junctionOffsetY;

						if (value === oldValue) {
							return;
						}

						this._junctionOffsetY = value;

						var ev = PropertyChangeEvent.create('junctionOffsetY', oldValue, value);
						this.dispatchEvent(ev);
					}
				}
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.EdgeEndpoint
				 */
				constructor: function EdgeEndpoint() {
					super_.constructor.call(this);
				}

			}
		};
		return desc;
	});

	var ZIndexList = RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.ZIndexList',

			field: {
				/**
				 * @private キーのソート済み配列。昇順（値が小さい順）にソートされている。
				 */
				_keyArray: null,

				/**
				 * @private key -> valueの配列 のマップ。 zIndex -> DU配列 のマップとして使用。
				 *          DU配列の中では、後から追加したものほど後ろに存在する。
				 */
				_map: null,
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.ZIndexList
				 */
				constructor: function ZIndexList() {
					super_.constructor.call(this);
					this._keyArray = [];
					this._map = {};
				},

				add: function(key, value) {
					if (!(key in this._map)) {
						this._map[key] = [];
						//keyArrayに新しいkeyを追加する
						this._addToKeyArray(key);
					}
					this._map[key].push(value);
				},

				remove: function(key, value) {
					if (!(key in this._map)) {
						return;
					}

					var array = this._map[key];

					var idx = array.indexOf(value);
					if (idx === -1) {
						//当該データは存在しない
						return;
					}

					//当該Valueを取り除く
					array.splice(idx, 1);
					if (array.length === 0) {
						//このkeyに対応するValueがなくなったら、マップのエントリごと削除
						delete this._map[key];
						//keyArrayからもエントリを削除
						var keyArrayIdx = this._keyArray.indexOf(key);
						this._keyArray.splice(keyArrayIdx, 1);
					}
				},

				getFirst: function(key) {
					if (!(key in this._map)) {
						return null;
					}
					//addの仕様により、mapに当該keyがあれば
					//必ず1つ以上のエントリが配列中に存在する
					return this._map[key][0];
				},

				getLast: function(key) {
					if (!(key in this._map)) {
						return null;
					}
					var array = this._map[key];
					var lastIndex = array.length;
					return array[lastIndex - 1];
				},

				/**
				 * 現在このリストで保持している全てのValueを、ソートキーの昇順で返します。
				 */
				getAllAcendant: function() {
					var ret = [];

					var pushFunc = Array.prototype.push;

					var keyArrayLen = this._keyArray.length;
					for (var i = 0; i < keyArrayLen; i++) {
						var key = this._keyArray[i];

						var valuesInKey = this._map[key];
						pushFunc.apply(ret, valuesInKey);
					}

					return ret;
				},

				getIndexInKey: function(key, value) {
					if (!(key in this._map)) {
						return null;
					}

					var idx = this._map[key].indexOf(value);
					return idx;
				},

				has: function(key, value) {
					var ret = this.getIndexInKey(key, value) !== -1;
					return ret;
				},

				getAppendTarget: function(key) {
					//TODO 今はコンテナにDUを追加すると即時にDUのDOMが追加され常に存在する前提になっているので
					//単純にgetLast()を取ればよいが、仮想化を行うとDUとしては存在しているがDOMとしては存在しなくなるので
					// foreach(key in keyArray)でループしながら、「実際表示中の要素」を探すように変更する必要がある。

					var len = this._keyArray.length;

					if (len === 0) {
						//先頭に追加せよ
						return null;
					}

					for (var i = 0; i < len; i++) {
						//keyArrayはkeyの値の昇順でソートされている
						var val = this._keyArray[i];
						if (key === val) {
							//すでにこのkeyを持つValueが存在
							return this.getLast(key);
						} else if (key < val) {
							//このkeyを持つValueはないが、
							//このkeyはキー配列のこの位置よりも大きいので
							//valのキー値の最後の要素の後に追加すればよい
							if (i === 0) {
								//先頭に追加せよ
								return null;
							}
							return this.getLast(i - 1);
						}
					}
					//一番最後に追加
					return this.getLast(val);
				},

				/**
				 * @private
				 */
				_addToKeyArray: function(key) {
					var len = this._keyArray.length;
					for (var i = 0; i < len; i++) {
						var val = this._keyArray[i];

						if (key === val) {
							//既にこのkeyは配列に存在する
							return;
						}

						if (key > val) {
							//降順でソート済みになるように追加
							//TODO 数が多くなるならバイナリサーチ等で検索するのも良いかも
							this._keyArray.splice(i, 0, key);
						}
					}

					//このkeyは一番小さい値だった→末尾に追加
					this._keyArray.push(key);
				},
			}
		};
		return desc;
	});

	var DisplayUnitDirtyEvent = Event.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.DisplayUnitDirtyEvent',

			field: {
				reason: null,
				displayUnit: null,
				parentDisplayUnit: null
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayUnitDirtyEvent
				 */
				constructor: function DisplayUnitDirtyEvent() {
					super_.constructor.call(this, 'displayUnitDirty');
				}
			}
		};
		return desc;
	});

	var DisplayUnitContainerEvent = Event.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.DisplayUnitContainerEvent',

			field: {
				displayUnit: null,
				parentDisplayUnit: null
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayUnitContainerEvent
				 */
				constructor: function DisplayUnitContainerEvent(type) {
					super_.constructor.call(this, type);
				}
			}
		};
		return desc;
	});

	var TransformEvent = Event.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.TransformEvent',
			field: {
				transform: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.TransformEvent
				 */
				constructor: function TransformEvent(type) {
					super_.constructor.call(this, type);
				}
			}
		};
		return desc;
	});

	var DisplayUnitContainer = DisplayUnit.extend(function(super_) {
		function getDisplayUnitByIdInner(container, id) {
			var children = container._children;
			for (var i = 0, len = children.length; i < len; i++) {
				var child = children[i];

				if (child.id === id) {
					return child;
				}

				if (DisplayUnitContainer.isClassOf(child)) {
					var ret = getDisplayUnitByIdInner(child, id);
					if (ret) {
						return ret;
					}
				}
			}
			return null;
		}

		var arrayPush = Array.prototype.push;

		function getChildrenAll(duContainer) {
			var ret = [];

			var children = duContainer._children;
			for (var i = 0, len = children.length; i < len; i++) {
				var child = children[i];

				if (DisplayUnitContainer.isClassOf(child)) {
					var cc = getChildrenAll(child);
					arrayPush.apply(ret, cc);
				} else {
					ret.push(child);
				}
			}

			return ret;
		}

		var desc = {
			name: 'h5.ui.components.stage.DisplayUnitContainer',
			field: {
				_children: null,
				_scaleX: null,
				_scaleY: null,
				_scrollX: null,
				_scrollY: null,
				_minScaleX: null,
				_minScaleY: null,
				_maxScaleX: null,
				_maxScaleY: null,
				_isUpdateTransformReserved: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayUnitContainer
				 */
				constructor: function DisplayUnitContainer(id) {
					super_.constructor.call(this, id);

					//TODO defaultValue
					this.x = 0;
					this.y = 0;
					this.width = 0;
					this.height = 0;

					this._scaleX = 1;
					this._scaleY = 1;

					//min,maxは、nullの場合は無効とする
					this._minScaleX = null;
					this._minScaleY = null;
					this._maxScaleX = null;
					this._maxScaleY = null;

					this._scrollX = 0;
					this._scrollY = 0;

					this._isUpdateTransformReserved = false;

					this._belongingLayer = null;

					this._children = [];
				},

				addDisplayUnit: function(du) {
					du._parentDU = this;

					this._children.push(du);

					if (this._rootStage) {
						du._onAddedToStage(this._rootStage, this._belongingLayer);
					}

					//このコンテナにDUが追加されたことをLayerまで通知・伝播
					//注：ここで、parentDU.__onDescendantAdded()としてはいけない。
					//Layerなど、自分の__onDescendantAdded()をオーバーライドしている場合に
					//正しく動作しなくなるため。
					this.__onDescendantAdded(du);
				},

				removeDisplayUnit: function(du) {
					var idx = this._children.indexOf(du);
					if (idx === -1) {
						return;
					}

					//削除されるDU側にクリーンアップのタイミングを与える
					//TODO ここで記述するのがよいか？
					if (typeof du._onRemoving === 'function') {
						du._onRemoving();
					}

					this._children.splice(idx, 1);

					du._parentDU = null;

					//TODO 指定されたduがコンテナの場合にそのduの子供のrootStageも再帰的にnullにする
					du._rootStage = null;

					//親に対してDUを削除したことを通知
					this.__onDescendantRemoved(du, this);

					//DU自身に削除されたことを通知
					du._onRemovedFromStage();
				},

				getDisplayUnitById: function(id) {
					var ret = getDisplayUnitByIdInner(this, id);
					return ret;
				},

				getDisplayUnitAll: function(includesDescendant) {
					if (includesDescendant === true) {
						return getChildrenAll(this);
					}
					//デフォルトでは子要素のみ取得
					return this._children;
				},

				/**
				 * オーバーライド
				 *
				 * @private
				 * @overrides
				 * @param rootStage
				 * @param belongingLayer
				 */
				_onAddedToStage: function(rootStage, belongingLayer) {
					super_._onAddedToStage.call(this, rootStage, belongingLayer);

					var children = this._children;
					for (var i = 0, len = children.length; i < len; i++) {
						var du = children[i];
						du._onAddedToStage(rootStage, belongingLayer);
					}
				},

				/**
				 * @private
				 */
				_onRemovedFromStage: function() {
					var children = this._children;
					for (var i = 0, len = children.length; i < len; i++) {
						var du = children[i];
						du._onRemovedFromStage();
					}

					//先に子供をパージしてから自分からStageへの参照を外す
					super_._onRemovedFromStage.call(this);
				},

				setMinScale: function(minScaleX, minScaleY) {
					this._minScaleX = minScaleX;
					this._minScaleY = minScaleY;
					this._clampScale();
				},

				setMaxScale: function(maxScaleX, maxScaleY) {
					this._maxScaleX = maxScaleX;
					this._maxScaleY = maxScaleY;
					this._clampScale();
				},

				setScale: function(scaleX, scaleY) {
					var x = scaleX == null ? this._scaleX : scaleX;
					var y = scaleY == null ? this._scaleY : scaleY;
					this._clampScale(x, y);
				},

				scrollTo: function(worldX, worldY) {
					this._scrollX = worldX;
					this._scrollY = worldY;
					this._setDirty(REASON_SCROLL_POSITION_CHANGE);
				},

				scrollBy: function(worldX, worldY) {
					var x = this._scrollX + worldX;
					var y = this._scrollY + worldY;
					this.scrollTo(x, y);
				},

				globalToLocalPosition: function(worldGlobalX, worldGlobalY) {
					var gpos = this.getWorldGlobalPosition();
					var localPos = WorldPoint.create(worldGlobalX - gpos.x, worldGlobalY - gpos.y);
					return localPos;
				},

				localToGlobalPosition: function(worldLocalX, worldLocalY) {
					var gpos = this.getWorldGlobalPosition();
					var globalPos = WorldPoint.create(worldLocalX + gpos.x, worldLocalY + gpos.y);
					return globalPos;
				},

				/**
				 * @private
				 */
				_clampScale: function(scaleX, scaleY) {
					var x = StageUtil.clamp(scaleX, this._minScaleX, this._maxScaleX);
					var y = StageUtil.clamp(scaleY, this._minScaleY, this._maxScaleY);

					var isScaleChanged = false;
					if (this._scaleX !== x || this._scaleY !== y) {
						isScaleChanged = true;
					}

					this._scaleX = x;
					this._scaleY = y;

					if (isScaleChanged) {
						this._setDirty(REASON_SCALE_CHANGE);
					}
				},

				/**
				 * @private
				 */
				_updateTransform: function(element) {
					var transform = h5.u.str.format('scale({0},{1}) translate({2},{3})',
							this._scaleX, this._scaleY, -this._scrollX, -this._scrollY);

					//直下のgタグに対してtransformをかける
					element.firstChild.setAttribute('transform', transform);
				},

				/**
				 * @private
				 */
				_setDirty: function(reasons) {
					//先に子供に通知し、globalPositionCacheをクリアさせる。
					//こうすることで、自コンテナの位置が移動した場合に
					//外から自分の子供のコンテナのglobalPositionを取得した時
					//正しい値が取得できる。
					this.__onParentDirtyNotify(this, reasons);
					super_._setDirty.call(this, reasons);
				},

				/**
				 * @private
				 */
				__onParentDirtyNotify: function(du, reasons) {
					super_.__onParentDirtyNotify.call(this, du, reasons);
					var that = this;
					this._children.forEach(function(childDU) {
						childDU.__onParentDirtyNotify(that, reasons);
					});
				},

				/**
				 * @private
				 */
				__renderDOM: function(view) {
					var rootSvg = createSvgElement('svg');
					rootSvg.setAttribute('data-h5-dyn-stage-role', 'container'); //TODO for debugging
					rootSvg.setAttribute('data-h5-dyn-du-id', this.id);

					//TODO 暫定的に、コンテナはoverflow:visibleにするようにした
					//width, heightの指定との整合性について検討
					rootSvg.style.overflow = "visible";

					//rootGは<g>要素。transformを一括してかけるため、
					//子要素は全てこの<g>の下に追加する。
					var rootG = createSvgElement('g');
					rootSvg.appendChild(rootG);

					var reason = UpdateReasonSet.create(REASON_INITIAL_RENDER);

					this.__updateDOM(view, rootSvg, reason);

					return rootSvg;
				},

				/**
				 * @private
				 */
				__getPracticalParentElement: function(containerRootElement) {
					return containerRootElement.firstChild;
				},

				/**
				 * @private
				 */
				__updateDOM: function(view, element, reason) {
					super_.__updateDOM.call(this, view, element, reason);

					if (reason.isScaleChanged || reason.isScrollPositionChanged) {
						this._updateTransform(element);
					}
				},

				/**
				 * 子孫に要素が追加されたときに子⇒親に向かって呼び出されるコールバック
				 *
				 * @private
				 * @param targetDU
				 */
				__onDescendantAdded: function(displayUnit) {
					if (this._parentDU) {
						this._parentDU.__onDescendantAdded(displayUnit);
					}
				},

				/**
				 * @private
				 */
				__onDescendantRemoved: function(displayUnit, parentDisplayUnit) {
					if (this._parentDU) {
						this._parentDU.__onDescendantRemoved(displayUnit, parentDisplayUnit);
					}
				}
			}
		};
		return desc;
	});


	//TODO LayerはDUの子クラスにしない方がよいか（DUContainerと一部が同じだとしても）
	var Layer = DisplayUnitContainer.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.Layer',
			field: {
				UIDragScreenScrollDirection: null
			},
			method: {
				/**
				 * @constructor
				 * @memberOf h5.ui.components.stage.Layer
				 */
				constructor: function Layer(id, stage) {
					super_.constructor.call(this);

					this.id = id;
					this.UIDragScreenScrollDirection = ScrollDirection.XY;
					this._rootStage = stage;
					this._belongingLayer = this;
				},

				/**
				 * オーバーライド
				 *
				 * @returns
				 */
				getWorldGlobalPosition: function() {
					var p = WorldPoint.create(this.x, this.y);
					return p;
				},

				/**
				 * オーバーライド。レイヤーのmoveはsvgの属性ではなくtranslateで行う(scaleと合わせて行うため)
				 *
				 * @param worldX
				 * @param worldY
				 */
				moveTo: function(worldX, worldY) {
					throw new Error('Layerは動かせません。スクロール位置を変更したい場合はStageView.scrollTo()を使用してください。');
				},

				/**
				 * オーバーライド。レイヤーのmoveはsvgの属性ではなくtranslateで行う(scaleと合わせて行うため)
				 *
				 * @param worldX
				 * @param worldY
				 */
				moveBy: function(worldX, worldY) {
					throw new Error('Layerは動かせません。スクロール位置を変更したい場合はStageView.scrollTo()を使用してください。');
				},

				/**
				 * @private
				 */
				__createGraphics: function(view, svgRoot) {
					var SVGGraphics = classManager.getClass('h5.ui.components.stage.SVGGraphics');

					var defs = view.getDefsForLayer(this);

					var graphics = SVGGraphics.create(view, svgRoot, defs);
					return graphics;
				},

				/**
				 * @private
				 */
				__createRootElement: function(view) {
					var rootSvg = createSvgElement('svg');
					rootSvg.setAttribute('data-h5-dyn-stage-role', 'layer'); //TODO for debugging
					rootSvg.setAttribute('data-h5-dyn-du-id', this.id);

					//レイヤーはgをtransformしてスクロールを実現するので
					//overflowはvisibleである必要がある
					rootSvg.style.overflow = "visible";

					//rootGは<g>要素。transformを一括してかけるため、
					//子要素は全てこの<g>の下に追加する。
					var rootG = createSvgElement('g');
					rootSvg.appendChild(rootG);

					return rootSvg;
				},

				/**
				 * @private
				 * @overrides
				 * @param du
				 */
				__onDirtyNotify: function(du, reasons) {
					var event = DisplayUnitDirtyEvent.create();
					event.displayUnit = du;

					var reason = UpdateReasonSet.create(reasons);
					event.reason = reason;

					this.dispatchEvent(event);
				},

				/**
				 * @private
				 * @overrides
				 * @param targetDU
				 * @param parentDU
				 */
				__onDescendantAdded: function(displayUnit) {
					var event = DisplayUnitContainerEvent.create('displayUnitAdd');
					event.displayUnit = displayUnit;
					this.dispatchEvent(event);
				},

				/**
				 * @private
				 * @overrides
				 * @param du 取り外されたDisplayUnit
				 */
				__onDescendantRemoved: function(displayUnit, parentDisplayUnit) {
					var event = DisplayUnitContainerEvent.create('displayUnitRemove');
					event.displayUnit = displayUnit;
					event.parentDisplayUnit = parentDisplayUnit;
					this.dispatchEvent(event);
				},

				/**
				 * 属するレイヤーは自分自身なので引数は無視する
				 *
				 * @private
				 * @param stage
				 * @param belongingLayer
				 */
				_onAddedToStage: function(stage, belongingLayer) {
					var children = this._children;
					for (var i = 0, len = children.length; i < len; i++) {
						var du = children[i];
						du._onAddedToStage(this._rootStage, this._belongingLayer);
					}
				},

				/**
				 * @private
				 */
				__onCascadeRemoving: function(srcDU, relatedDU) {
					var ev = DisplayUnitCascadeRemovingEvent.create(srcDU, relatedDU);
					var ret = this.dispatchEvent(ev);
					return ret;
				}
			}
		};
		return desc;
	});

	var BulkOperation = RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.BulkOperation',
			field: {
				_targets: null,
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.BulkOperation
				 */
				constructor: function BulkOperation(targets) {
					super_.constructor.call(this);
					if (!targets) {
						return;
					}
					this._targets = Array.isArray(targets) ? targets : [targets];
				},
				addTargets: function(targets) {
					if (!targets) {
						return;
					}

					var candidate = Array.isArray(targets) ? targets : [targets];
					for (var i = 0, len = candidate.length; i < len; i++) {
						var t = candidate[i];
						if ($.inArray(t, this._targets) === -1) {
							//既存の配列に存在しないもののみ対象として追加
							this._targets.push(t);
						}
					}
				},
				getTargets: function() {
					return this._targets;
				},
				forEach: function(func) {
					for (var i = 0, len = this._targets.length; i < len; i++) {
						func.call(this, this._targets[i], i, this);
					}
				},
				remove: function() {
					for (var i = 0, len = this._targets.length; i < len; i++) {
						var t = this._targets[i];
						t.remove();
					}
				},
				moveToForefront: function() {
					if (!this._targets) {
						return;
					}

					//TODO 完全に最前面にするためには、foremostLayerに移動させる必要がある
					for (var i = 0, len = this._targets.length; i < len; i++) {
						var dom = this._targets[i]._domRoot;
						if (dom) {
							var parent = dom.parentNode;
							parent.removeChild(dom);
							parent.appendChild(dom);
						}
					}
				}
			}
		};
		return desc;
	});

})(jQuery);

(function($) {
	'use strict';

	var classManager = h5.cls.manager;

	var RootClass = classManager.getClass('h5.cls.RootClass');

	var Event = classManager.getClass('h5.event.Event');
	var EventDispatcher = classManager.getClass('h5.event.EventDispatcher');

	var Rect = classManager.getClass('h5.ui.components.stage.Rect');
	var DisplayPoint = classManager.getClass('h5.ui.components.stage.DisplayPoint');
	var WorldPoint = classManager.getClass('h5.ui.components.stage.WorldPoint');
	var Layer = classManager.getClass('h5.ui.components.stage.Layer');
	var DragSession = classManager.getClass('h5.ui.components.stage.DragSession');
	var UpdateReasonSet = classManager.getClass('h5.ui.components.stage.UpdateReasonSet');

	var BasicDisplayUnit = classManager.getClass('h5.ui.components.stage.BasicDisplayUnit');
	var DisplayUnitContainer = classManager.getClass('h5.ui.components.stage.DisplayUnitContainer');
	var Edge = classManager.getClass('h5.ui.components.stage.Edge');
	var SVGDefinitions = classManager.getClass('h5.ui.components.stage.SVGDefinitions');

	var UpdateReasons = h5.ui.components.stage.UpdateReasons;
	var ScrollDirection = h5.ui.components.stage.ScrollDirection;
	var DragMode = h5.ui.components.stage.DragMode;
	var SvgUtil = h5.ui.components.stage.SvgUtil;

	var SortedList = RootClass.extend(function(super_) {
		function getInsertionIndex(array, target, compareFunc, start, end) {
			var len = array.length;

			if (len == 0) {
				return 0;
			}

			if (start === undefined) {
				start = 0;
			}
			if (end === undefined) {
				end = len - 1;
			}

			if (end <= start) {
				if (compareFunc(target, array[start]) < 0) {
					return start;
				}
				return start + 1;
			}

			var mid = start + ((end - start) >>> 1);

			var comp = compareFunc(target, array[mid]);

			if (comp == 0) {
				return mid + 1;
			} else if (comp < 0) {
				return getInsertionIndex(array, target, compareFunc, start, mid - 1);
			} else {
				return getInsertionIndex(array, target, compareFunc, mid + 1, end);
			}
		}

		function sortedInsert(array, target, compareFunc) {
			array.splice(getInsertionIndex(array, target, compareFunc), 0, target);
		}

		var desc = {
			name: 'h5.ui.components.stage.SortedList',

			field: {
				_array: null,
				_comparator: null
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.SortedList
				 */
				constructor: function SortedList(comparator) {
					super_.constructor.call(this);

					this._array = [];
					this._comparator = comparator;
				},

				getArray: function() {
					return this._array;
				},

				add: function(value) {
					if (!Array.isArray(value)) {
						value = [value];
					}

					//valueは常に配列

					for (var i = 0, len = value.length; i < len; i++) {
						var val = value[i];
						sortedInsert(this._array, val, this._comparator);
					}
				},

				remove: function(value) {
					var idx = this._array.indexOf(value);
					if (idx === -1) {
						return;
					}
					this._array.splice(idx, 1);
				},

				clear: function() {
					this._array = [];
				}
			}
		};
		return desc;
	});

	var ReadOnlyViewport = RootClass.extend(function(super_) {

		var desc = {
			name: 'h5.ui.components.stage.ReadOnlyViewport',

			field: {
				_viewport: null
			},

			accessor: {
				scaleX: {
					get: function() {
						return this._viewport._scaleX;
					}
				},
				scaleY: {
					get: function() {
						return this._viewport._scaleY;
					}
				},
				displayX: {
					get: function() {
						return this._viewport._displayRect.x;
					}
				},
				displayY: {
					get: function() {
						return this._viewport._displayRect.y;
					}
				},
				displayWidth: {
					get: function() {
						return this._viewport._displayRect.width;
					}
				},
				displayHeight: {
					get: function() {
						return this._viewport._displayRect.height;
					}
				},
				worldX: {
					get: function() {
						return this._viewport._worldRect.x;
					}
				},
				worldY: {
					get: function() {
						return this._viewport._worldRect.y;
					}
				},
				worldWidth: {
					get: function() {
						return this._viewport._worldRect.width;
					}
				},
				worldHeight: {
					get: function() {
						return this._viewport._worldRect.height;
					}
				}
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.ReadOnlyViewport
				 */
				constructor: function ReadOnlyViewport(viewport) {
					super_.constructor.call(this);
					this._viewport = viewport;
				},

				getDisplayRect: function() {
					return this._viewport.getDisplayRect();
				},

				getWorldRect: function() {
					return this._viewport.getWorldRect();
				}
			}
		};
		return desc;
	});

	var Viewport = EventDispatcher.extend(function(super_) {
		var DEFAULT_BOUNDARY_WIDTH = 25;

		var desc = {
			name: 'h5.ui.components.stage.Viewport',

			field: {
				_displayRect: null,
				_worldRect: null,
				_scaleX: null,
				_scaleY: null,
				boundaryWidth: null
			},

			accessor: {
				scaleX: {
					get: function() {
						return this._scaleX;
					}
				},
				scaleY: {
					get: function() {
						return this._scaleY;
					}
				},
				displayX: {
					get: function() {
						return this._displayRect.x;
					}
				},
				displayY: {
					get: function() {
						return this._displayRect.y;
					}
				},
				displayWidth: {
					get: function() {
						return this._displayRect.width;
					}
				},
				displayHeight: {
					get: function() {
						return this._displayRect.height;
					}
				},
				worldX: {
					get: function() {
						return this._worldRect.x;
					}
				},
				worldY: {
					get: function() {
						return this._worldRect.y;
					}
				},
				worldWidth: {
					get: function() {
						return this._worldRect.width;
					}
				},
				worldHeight: {
					get: function() {
						return this._worldRect.height;
					}
				}
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.Viewport
				 */
				constructor: function Viewport() {
					super_.constructor.call(this);
					this._displayRect = Rect.create();
					this._worldRect = Rect.create();
					this._scaleX = 1;
					this._scaleY = 1;
					this.boundaryWidth = DEFAULT_BOUNDARY_WIDTH;
				},

				setDisplaySize: function(dispWidth, dispHeight) {
					this.setDisplayRect(null, null, dispWidth, dispHeight);
				},

				getDisplayRect: function() {
					var rect = Rect.create(this._displayRect.x, this._displayRect.y,
							this._displayRect.width, this._displayRect.height);
					return rect;
				},

				setDisplayRect: function(dispX, dispY, dispWidth, dispHeight) {
					this._displayRect.setRect(dispX, dispY, dispWidth, dispHeight);

					var wx = this._displayRect.x / this._scaleX;
					var wy = this._displayRect.y / this._scaleY;
					var ww = this._displayRect.width / this._scaleX;
					var wh = this._displayRect.height / this._scaleY;
					this._worldRect.setRect(wx, wy, ww, wh);

					//setWorldRectもあるので注意
					var event = Event.create('rectChange');
					this.dispatchEvent(event);
				},

				setWorldSize: function(worldWidth, worldHeight) {
					this.setWorldRect(null, null, worldWidth, worldHeight);
				},

				setWorldRect: function(worldX, worldY, worldWidth, worldHeight) {
					this._worldRect.setRect(worldX, worldY, worldWidth, worldHeight);

					var dx = this._worldRect.x * this._scaleX;
					var dy = this._worldRect.y * this._scaleY;
					var dw = this._worldRect.width * this._scaleX;
					var dh = this._worldRect.height * this._scaleY;
					this._displayRect.setRect(dx, dy, dw, dh);

					var event = Event.create('rectChange');
					this.dispatchEvent(event);
				},

				getWorldRect: function() {
					var rect = Rect.create(this._worldRect.x, this._worldRect.y,
							this._worldRect.width, this._worldRect.height);
					return rect;
				},

				//dispScaleCenterは、ディスプレイ座標系における、拡大時の中心座標。
				//原点は画面の左上ではなくディスプレイ座標系自体の原点(スクロールしている場合特に注意)。
				setScale: function(scaleX, scaleY, centerWorldX, centerWorldY) {
					if (scaleX != null && scaleX >= 0) {
						this._scaleX = scaleX;
					}
					if (scaleY != null && scaleY >= 0) {
						this._scaleY = scaleY;
					}

					//TODO 最小スケール値をここで持たせるか、Stageで制限するか
					if (this._scaleX < 0.05) {
						this._scaleX = 0.05;
					}
					if (this._scaleY < 0.05) {
						this._scaleY = 0.05;
					}

					var oldWorldW = this.worldWidth;
					var oldWorldH = this.worldHeight;

					var newWorldW = this.displayWidth / this._scaleX;
					var newWorldH = this.displayHeight / this._scaleY;
					this._worldRect.setSize(newWorldW, newWorldH);

					var event = Event.create('scaleChange');
					this.dispatchEvent(event);

					//今回の拡縮の際の中心点（ワールド座標系）
					var worldScaleCenterX = centerWorldX;
					var worldScaleCenterY = centerWorldY;

					//この拡縮に伴って発生する左・上のずれの割合を算出
					//(拡縮の中心が画面左上の場合(0,0)、右下の場合(1,1)になる)
					var gapXRatio = (worldScaleCenterX - this._worldRect.x) / oldWorldW;
					var gapYRatio = (worldScaleCenterY - this._worldRect.y) / oldWorldH;

					//求められた比率を使って、実際のずれ量だけスクロールする
					//これにより、指定されたcenterの位置を中心にスクロールしたことになる
					var worldDx = (newWorldW - oldWorldW) * gapXRatio;
					var worldDy = (newWorldH - oldWorldH) * gapYRatio;

					//DisplayRect側を更新すれば、WorldRect側は自動的に更新される
					//このタイミングで rectChangeイベントが発生する
					this.scrollWorldBy(-worldDx, -worldDy);
				},

				scrollTo: function(dispX, dispY) {
					this.setDisplayRect(dispX, dispY, null, null);
				},

				scrollBy: function(dispDx, dispDy) {
					var x = this._displayRect.x + dispDx;
					var y = this._displayRect.y + dispDy;
					this.scrollTo(x, y);
				},

				scrollWorldTo: function(worldX, worldY) {
					this.setWorldRect(worldX, worldY, null, null);
				},

				scrollWorldBy: function(worldDx, worldDy) {
					var x = this._worldRect.x + worldDx;
					var y = this._worldRect.y + worldDy;
					this.scrollWorldTo(x, y);
				},

				getWorldPositionFromDisplayOffset: function(displayOffsetX, displayOffsetY) {
					var wx = this._worldRect.x + displayOffsetX / this._scaleX;
					var wy = this._worldRect.y + displayOffsetY / this._scaleY;
					var point = WorldPoint.create(wx, wy);
					return point;
				},

				getDisplayPositionFromDisplayOffset: function(displayOffsetX, displayOffsetY) {
					var dispX = this.displayX + displayOffsetX;
					var dispY = this.displayY + displayOffsetY;
					var point = DisplayPoint.create(dispX, dispY);
					return point;
				},

				getXLengthOfWorld: function(displayX1, displayX0) {
					if (displayX0 == null) {
						displayX0 = 0;
					}
					var ret = Math.abs((displayX1 - displayX0) / this._scaleX);
					return ret;
				},

				getYLengthOfWorld: function(displayY1, displayY0) {
					if (displayY0 == null) {
						displayY0 = 0;
					}
					var ret = Math.abs((displayY1 - displayY0) / this._scaleY);
					return ret;
				},

				getXLengthOfDisplay: function(worldX1, worldX0) {
					if (worldX0 == null) {
						worldX0 = 0;
					}
					var ret = Math.abs((worldX1 - worldX0) * this._scaleX);
					return ret;
				},

				getYLengthOfDisplay: function(worldY1, worldY0) {
					if (worldY0 == null) {
						worldY0 = 0;
					}
					var ret = Math.abs((worldY1 - worldY0) * this._scaleY);
					return ret;
				},

				toWorldX: function(displayX) {
					return displayX / this._scaleX;
				},

				toWorldY: function(displayY) {
					return displayY / this._scaleY;
				},

				toDisplayX: function(worldX) {
					return worldX * this._scaleX;
				},

				toDisplayY: function(worldY) {
					return worldY * this._scaleY;
				},

				getWorldPosition: function(displayX, displayY) {
					var wx = displayX / this._scaleX;
					var wy = displayY / this._scaleY;
					var point = WorldPoint.create(wx, wy);
					return point;
				},

				getDisplayPosition: function(worldX, worldY) {
					var dispX = worldX * this._scaleX;
					var dispY = worldY * this._scaleY;
					var point = DisplayPoint.create(dispX, dispY);
					return point;
				},

				/**
				 * 指定されたディスプレイ座標（ただしStageルート要素の左上を原点とする値）が、現在の表示範囲において9-Sliceのどの位置になるかを取得します。
				 *
				 * @param displayX ディスプレイX座標（ただしStageルート要素の左上を原点とする値）
				 * @param displayY ディスプレイY座標（ただしStageルート要素の左上を原点とする値）
				 * @returns { x: -1 or 0 or 1, y: -1 or 0 or 1 } というオブジェクト。
				 *          -1の場合は上端または左端、1は下端または右端、0は中央部分
				 */
				getNineSlicePosition: function(displayX, displayY) {
					var nineSlice = {
						x: 0,
						y: 0
					};

					if (this.displayWidth > this.boundaryWidth * 2) {
						//境界とみなす幅(上下あるので2倍する)より現在の描画サイズが小さい場合は
						//必ず「中央」とみなす
						if (displayX < this.boundaryWidth) {
							nineSlice.x = -1;
						} else if (displayX > (this.displayWidth - this.boundaryWidth)) {
							nineSlice.x = 1;
						}
					}

					if (this.displayHeight > this.boundaryWidth * 2) {
						if (displayY < this.boundaryWidth) {
							nineSlice.y = -1;
						} else if (displayY > (this.displayHeight - this.boundaryWidth)) {
							nineSlice.y = 1;
						}
					}

					return nineSlice;
				},

				createReadOnlyReference: function() {
					return ReadOnlyViewport.create(this);
				}

			//将来追加予定だが現時点では使っていないのでコメントアウト
			//				getRelativePosition: function(displayUnit) {
			//					var duGlobalPos = displayUnit.getWorldGlobalPosition();
			//
			//					var rRight = this.worldX + this.worldWidth;
			//
			//					if (duGlobalPos.x > rRight) {
			//						return DU_POSITION_BEYOND_RIGHT;
			//					}
			//
			//					var duRight = duGlobalPos.x + du.width;
			//					if (duRight < this.worldX) {
			//						return DU_POSITION_BEYOND_LEFT;
			//					}
			//
			//					var duBottom = duGlobalPos.y + du.height;
			//					if (duBottom < this.worldY) {
			//						return DU_POSITION_BEYOND_TOP;
			//					}
			//
			//					var rBottom = this.worldY + this.worldHeight;
			//					if (duGlobalPos.y > rBottom) {
			//						return DU_POSITION_BEYOND_BOTTOM;
			//					}
			//
			//					return DU_POSITION_INTERSECT;
			//				},
			//
			//				isOutOfView: function(du) {
			//					return this.getRelativePosition(du) !== DU_POSITION_INTERSECT;
			//				}
			}
		};
		return desc;
	});

	var CoordinateConverter = RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.CoordinateConverter',
			field: {
				_viewport: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.CoordinateConverter
				 */
				constructor: function CoordinateConverter(viewport) {
					super_.constructor.call(this);
					this._viewport = viewport;
				},
				toWorldPosition: function(displayX, displayY) {
					var x;
					var y;
					if (arguments.length === 1 && DisplayPoint.isClassOf(displayX)) {
						x = displayX.x;
						y = displayX.y;
					} else {
						x = displayX;
						y = displayY;
					}
					return this._viewport.getWorldPosition(x, y);
				},

				toWorldXLength: function(displayX1, displayX0) {
					return this._viewport.getXLengthOfWorld(displayX1, displayX0);
				},

				toWorldYLength: function(displayY1, displayY0) {
					return this._viewport.getYLengthOfWorld(displayY1, displayY0);
				},

				toWorldX: function(displayX) {
					return this._viewport.toWorldX(displayX);
				},

				toWorldY: function(displayY) {
					return this._viewport.toWorldY(displayY);
				},

				toDisplayPosition: function(worldX, worldY) {
					var x;
					var y;
					if (arguments.length === 1 && WorldPoint.isClassOf(worldX)) {
						x = worldX.x;
						y = worldX.y;
					} else {
						x = worldX;
						y = worldY;
					}
					return this._viewport.getDisplayPosition(x, y);
				},
				toDisplayXLength: function(worldX1, worldX0) {
					return this._viewport.getXLengthOfDisplay(worldX1, worldX0);
				},
				toDisplayYLength: function(worldY1, worldY0) {
					return this._viewport.getYLengthOfDisplay(worldY1, worldY0);
				},

				toDisplayX: function(worldX) {
					return this._viewport.toDisplayX(worldX);
				},

				toDisplayY: function(worldY) {
					return this._viewport.toDisplayY(worldY);
				}
			}
		};
		return desc;
	});

	var SightChangeEvent = Event.extend(function(super_) {
		var EVENT_SIGHT_CHANGE = 'sightChange';

		var desc = {
			name: 'h5.ui.components.stage.SightChangeEvent',

			field: {
				view: null,

				scrollPosition: null,

				scale: null
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.SightChangeEvent
				 */
				constructor: function SightChangeEvent(view, scrollPositionChange, scaleChange) {
					super_.constructor.call(this, EVENT_SIGHT_CHANGE);

					this.view = view;
					this.scrollPosition = scrollPositionChange;
					this.scale = scaleChange;
				}
			}
		};
		return desc;
	});

	var DOMManager = RootClass
			.extend(function(super_) {
				var desc = {
					name: 'h5.ui.components.stage.DOMManager',

					field: {
						_view: null,
						_duElementMap: null,
						_duZCacheMap: null,

						_numOfDU: null,

						_bulkAddRootDU: null,
						_fragmentRoot: null,
						_numOfBulkAdd: null
					},

					accessor: {
						numberOfDisplayUnit: {
							get: function() {
								return this._numOfDU;
							}
						}
					},

					method: {
						/**
						 * @memberOf h5.ui.components.stage.DOMManager
						 */
						constructor: function DOMManager() {
							super_.constructor.call(this);
							this._duElementMap = new Map();
							this._duZCacheMap = new Map();

							this._numOfDU = 0;
							this._numOfBulkAdd = 0;
						},

						beginBulkAdd: function(rootDisplayUnit) {
							this._bulkAddRootDU = rootDisplayUnit;
							this._fragmentRoot = document.createDocumentFragment();
							this._numOfBulkAdd = 0;
						},

						endBulkAdd: function() {
							var containerRootElement = this.getElement(this._bulkAddRootDU);
							var parentElement = this._bulkAddRootDU
									.__getPracticalParentElement(containerRootElement);

							//Fragmentの中身をまとめて追加
							parentElement.appendChild(this._fragmentRoot);

							this._fragmentRoot = null;
							this._bulkAddRootDU = null;

							var ret = this._numOfBulkAdd;
							this._numOfBulkAdd = 0;
							return ret;
						},

						/**
						 * 渡されたDUをレンダーし、zIndexの制約を満たす適切な位置に追加します。 渡されたDUはこのマネージャの管理下に置かれます。
						 *
						 * @param du
						 */
						add: function(du, element, isManageOnly) {
							if (isManageOnly !== true) {
								//レイヤーの場合はルート要素なので管理だけ行う。
								//それ以外のDUの場合は、要素を適切なzIndexの位置に挿入する
								this._insert(du, element);
							}

							this._numOfDU++;

							//要素を内部で保持
							this._duElementMap.set(du, element);
						},

						/**
						 * 与えられたDUに対応するDOM要素が、DUのzIndex制約を満たすようにDOM要素の位置を更新します。
						 *
						 * @param du
						 */
						updateElementZIndex: function(du, oldValue, newValue) {
							var element = this.getElement(du);
							if (!element) {
								//対応するDOMがレンダーされていなければ何もしない
								return;
							}

							this._removeElement(du, du.parentDisplayUnit, oldValue);
							this._insert(du, element);
						},

						/**
						 * 与えられたDUに対応するDOM要素を返します。
						 *
						 * @param du
						 * @returns
						 */
						getElement: function(du) {
							return this._duElementMap.get(du);
						},

						/**
						 * 与えられたDUが既に描画済みかどうかを返します。
						 *
						 * @param du
						 * @returns {Boolean}
						 */
						has: function(du) {
							return this._duElementMap.has(du);
						},

						/**
						 * 与えられたDUに対応するDOM要素をDOMツリーから削除します。DUはこのマネージャの管理外になります。
						 *
						 * @param du
						 */
						remove: function(du, parentDisplayUnit) {
							if (DisplayUnitContainer.isClassOf(du)) {
								//コンテナの場合は子孫(すべて)のDUをchild-firstで先に削除し、その後自分自身を削除
								var children = du.getDisplayUnitAll();
								for (var i = 0, len = children.length; i < len; i++) {
									var child = children[i];
									this.remove(child, du);
								}
							}

							//要素をDOMツリーから削除
							this._removeElement(du, parentDisplayUnit);

							this._numOfDU--;

							//MEMO: EclipseのJSDTだと.deleteの記述がエラーになる
							//各種キャッシュから当該DUのエントリを削除
							this._duElementMap['delete'](du);
							if (DisplayUnitContainer.isClassOf(du)) {
								this._duZCacheMap['delete'](du);
							}
						},

						/**
						 * 与えられたDUに対応するDOM要素をDOMツリーから削除します。要素が存在しない場合は何もしません。
						 *
						 * @private
						 * @param du
						 */
						_removeElement: function(du, parentDU, oldZIndex) {
							var element = this._duElementMap.get(du);

							if (!element) {
								return;
							}

							//対応する要素が描画されていたら親から取り外す
							var parentNode = element.parentNode;
							if (parentNode) {
								parentNode.removeChild(element);
							}

							this._removeZCacheEntry(parentDU, du, element, oldZIndex);
						},

						/**
						 * 与えられたコンテナDUに対応するZCacheを更新します。
						 *
						 * @private
						 * @param containerDU
						 * @param targetDU
						 * @param targetElement
						 */
						_removeZCacheEntry: function(containerDU, targetDU, targetElement,
								oldZIndex) {
							//entry = { zIndexArray: , zIndexToFirstElementMap:  };
							var entry = this._duZCacheMap.get(containerDU);
							if (!entry) {
								return;
							}

							var targetDUZIndex = targetDU.zIndex;
							if (oldZIndex != null) {
								targetDUZIndex = oldZIndex;
							}

							var firstElement = entry.zIndexToFirstElementMap.get(targetDUZIndex);
							if (targetElement !== firstElement) {
								//先頭の要素でなかったということは、
								//同じzIndexを持つ要素がすでに存在し、かつ
								//今削除対象になっている要素は（先頭要素ではないので）キャッシュ更新の必要がない
								return;
							}

							//削除する要素が、そのzIndexを持つ先頭の要素だったので
							//そのzIndex値->DOM要素 のマップエントリを削除。
							//同時に、先頭の要素だったということは同じzIndexを持つ要素は
							//他にないので、zIndexArrayからもそのzIndex値を削除する。
							entry.zIndexToFirstElementMap['delete'](targetDUZIndex);
							var ary = entry.zIndexArray;
							var idx = ary.indexOf(targetDUZIndex);
							ary.splice(idx, 1);
						},

						/**
						 * DUのzIndex制約を満たす位置にelementを挿入します。
						 *
						 * @private
						 * @param element
						 */
						_insert: function(du, element) {
							var containerDU = du.parentDisplayUnit;
							if (!containerDU) {
								throw new Error('指定されたDUは親がありません。要素をDOMツリーに追加できません。');
							}
							var containerElement = this.getElement(containerDU);
							if (!containerElement) {
								throw new Error('コンテナに対応するDOM要素がありません。要素をDOMツリーに追加できません。');
							}

							if (this._fragmentRoot) {
								this._numOfBulkAdd++;
							}

							//MEMO: コンテナ要素はsvg,gと実際に2つ存在するが、
							//「直接子要素を保持する要素」を取得するので、このAPIの名前は
							//"actual"ではなく"practical"とする
							var parentElement;
							if (this._fragmentRoot && containerDU === this._bulkAddRootDU) {
								//バルク追加の最中で、親DUがバルク追加のルートDUだったら
								//DocumentFragmentを親として追加させる。
								//これにより、この後バルクで追加されるDUは
								//すべてDocumentFragmentの下に追加されることになる。
								parentElement = this._fragmentRoot;
							} else {
								parentElement = containerDU
										.__getPracticalParentElement(containerElement);
							}

							var cacheEntry = this._duZCacheMap.get(containerDU);
							if (!cacheEntry) {
								var cacheEntry = this._createZCacheEntry();
								this._duZCacheMap.set(containerDU, cacheEntry);
							}

							var zIndexArray = cacheEntry.zIndexArray;
							var zIndexToFirstElementMap = cacheEntry.zIndexToFirstElementMap;

							//{ exists: , index: }
							var info = this._getNearestGreaterZIndexInfo(cacheEntry, du.zIndex);
							var greaterZArrayIndex = info.index;

							if (greaterZArrayIndex == null) {
								//指定されたDUは一番大きいzIndexを持つので末尾に挿入
								parentElement.appendChild(element);
							} else {
								//自分よりも大きいzIndexを持つ先頭要素の前に挿入
								var nearestZIndexValue = zIndexArray[greaterZArrayIndex];
								var nearestGreaterElement = zIndexToFirstElementMap
										.get(nearestZIndexValue);
								parentElement.insertBefore(element, nearestGreaterElement);
							}

							if (!info.exists) {
								//指定されたzIndex値はこのキャッシュエントリに存在しなかったので追加
								//なお、すでに配列に存在する場合は何もしない
								if (greaterZArrayIndex == null) {
									//このDUのzIndexは一番大きい値なので末尾に追加
									zIndexArray.push(du.zIndex);
								} else {
									zIndexArray.splice(greaterZArrayIndex, 0, du.zIndex);
								}
								//elementはこのzIndex値に対応する先頭要素になるのでMapに追加
								zIndexToFirstElementMap.set(du.zIndex, element);
							}
						},

						/**
						 * ある1つのDUに対応するZキャッシュエントリを作成します。<br>
						 * Zキャッシュエントリは{ zIndexArray: [], zIndexToFirstElementMap:
						 * Map}という構造のオブジェクトです。
						 *
						 * @private
						 * @returns {Object} キャッシュエントリ
						 */
						_createZCacheEntry: function() {
							var entry = {
								zIndexArray: [],
								zIndexToFirstElementMap: new Map()
							};
							return entry;
						},

						/**
						 * 与えられたzIndex値より大きく、かつキャッシュエントリとして存在する最も小さいzIndexに対応する
						 * zIndexArrayのインデックスと、与えられたzIndex値がキャッシュのzIndexArrayに存在するかどうかを表すフラグを持つオブジェクトを返します。
						 * 戻り値のオブジェクトの型：{ exists: boolean, index: Number }
						 *
						 * @private
						 * @param cacheEntry Zキャッシュエントリ
						 * @param value 検索対象のzIndex値
						 * @returns キャッシュ情報
						 */
						_getNearestGreaterZIndexInfo: function(cacheEntry, value) {
							var existsTargetZValue = false;

							//zIndexArrayには、値の小さい順にzIndex値が入っている
							var ary = cacheEntry.zIndexArray;
							for (var i = 0, len = ary.length; i < len; i++) {
								var zIndex = ary[i];

								if (zIndex === value) {
									existsTargetZValue = true;
								} else if (zIndex > value) {
									return {
										exists: existsTargetZValue,
										index: i
									};
								}
							}
							return {
								exists: existsTargetZValue,
								index: null
							};
						}
					}
				};
				return desc;
			});

	var StageView = EventDispatcher
			.extend(function(super_) {
				//DUとViewportの位置関係を表す定数
				var DU_POSITION_INTERSECT = 0;
				var DU_POSITION_BEYOND_LEFT = 1;
				var DU_POSITION_BEYOND_TOP = 2;
				var DU_POSITION_BEYOND_RIGHT = 3;
				var DU_POSITION_BEYOND_BOTTOM = 4;

				var desc = {
					name: 'h5.ui.components.stage.StageView',

					field: {
						_stage: null,

						_x: null,
						_y: null,

						_coordinateConverter: null,

						_rootElement: null,

						_foremostSvg: null,
						_foremostSvgGroup: null,

						_viewport: null,

						_viewportReadOnly: null,

						/**
						 * 実際にDOMを描画する範囲
						 */
						_renderRect: null,

						_isUpdateTransformReserved: null,

						_scaleRangeX: null,
						_scaleRangeY: null,

						_layerDefsMap: null,

						_rowIndex: null,
						_columnIndex: null,

						_duAddListener: null,
						_duRemoveListener: null,
						_duDirtyListener: null,

						_dragTargetDUInfoMap: null,

						_dragSelectOverlayRect: null,

						_domManager: null,

						_updateCallWrapper: null,

						_duRenderStandbyMap: null,

						_duDirtyReasonMap: null,

						_updateAnimationFrameId: null,

						_isUpdateLayerScrollPositionRequired: null,

						_inInitialized: null
					},

					accessor: {
						x: {
							get: function() {
								return this._x;
							},
							set: function(value) {
								var oldValue = this._x;

								if (oldValue === value) {
									return;
								}

								this._x = value;

								if (this._rootElement) {
									$(this._rootElement).css({
										left: value
									});
								}
							}
						},
						y: {
							get: function() {
								return this._y;
							},
							set: function(value) {
								var oldValue = this._y;

								if (value === oldValue) {
									return;
								}

								this._y = value;

								if (this._rootElement) {
									$(this._rootElement).css({
										top: value
									});
								}
							}
						},
						width: {
							get: function() {
								return this._viewport.displayWidth;
							}
						},
						height: {
							get: function() {
								return this._viewport.displayHeight;
							}
						},

						rowIndex: {
							get: function() {
								return this._rowIndex;
							}
						},

						columnIndex: {
							get: function() {
								return this._columnIndex;
							}
						},

						coordinateConverter: {
							get: function() {
								return this._coordinateConverter;
							}
						},

						scrollX: {
							get: function() {
								return this._viewport.displayX;
							}
						},

						scrollY: {
							get: function() {
								return this._viewport.displayY;
							}
						},

						viewport: {
							get: function() {
								if (this._viewportReadOnly) {
									return this._viewportReadOnly;
								}
								this._viewportReadOnly = this._viewport.createReadOnlyReference();
								return this._viewportReadOnly;
							}
						}
					},

					method: {
						/**
						 * @memberOf h5.ui.components.stage.StageView
						 * @constructor
						 */
						constructor: function StageView(stage) {
							super_.constructor.call(this);
							this._stage = stage;
							this._x = 0;
							this._y = 0;

							this._inInitialized = false;

							this._isUpdateLayerScrollPositionRequired = true;

							this._domManager = DOMManager.create(this);

							var that = this;
							/**
							 * @private
							 */
							this._updateCallWrapper = function() {
								that._doUpdate();
							};

							this._duDirtyReasonMap = new Map();

							this._duRenderStandbyMap = new Map();

							this._layerDefsMap = new Map();

							this._isUpdateTransformReserved = false;

							this._scaleRangeX = {
								min: ABSOLUTE_SCALE_MIN,
								max: null
							};

							this._scaleRangeY = {
								min: ABSOLUTE_SCALE_MIN,
								max: null
							};

							var viewport = Viewport.create();
							this._viewport = viewport;

							this._coordinateConverter = CoordinateConverter.create(this._viewport);

							this._addToStage();
						},

						/**
						 * @private
						 */
						_addToStage: function() {
							var $root = $('<div class="h5-stage-view-root"></div>');
							$root.css({
								position: 'absolute',
								overflow: 'hidden',
								margin: 0,
								padding: 0,
								width: this._width,
								height: this._height,
								top: this._y,
								left: this._x
							});
							this._rootElement = $root[0];
							this._stage.rootElement.appendChild(this._rootElement);
						},

						/**
						 * @private
						 */
						_initForemostSvg: function() {
							var foremostSvg = SvgUtil.createElement('svg');
							foremostSvg.setAttribute('data-h5-dyn-stage-role', 'foremostSvg'); //TODO for debugging

							//レイヤーはgをtransformしてスクロールを実現するので
							//overflowはvisibleである必要がある
							foremostSvg.style.overflow = "visible";

							//rootGは<g>要素。transformを一括してかけるため、
							//子要素は全てこの<g>の下に追加する。
							var foremostG = SvgUtil.createElement('g');
							foremostSvg.appendChild(foremostG);

							//SVGのwidth, heightはSVGAttirubute
							//Chromeの場合overflow:visibleにしてもサイズを0x0にすると
							//描画されなくなるため1x1とする。
							$(foremostSvg).css({
								position: 'absolute',
								margin: 0,
								padding: 0,
								width: 1,
								height: 1
							});

							SvgUtil.setAttributes(foremostSvg, {
								overflow: 'visible',
								'pointer-events': 'none'
							});

							this._foremostSvg = foremostSvg;
							this._foremostSvgGroup = foremostG;
							this._rootElement.appendChild(foremostSvg);
						},

						init: function() {
							if (this._inInitialized) {
								return;
							}
							this._inInitialized = true;

							$(this._rootElement).css({
								left: this._x,
								top: this._y,
								width: this._width,
								height: this._height
							});

							var layers = this._stage._layers;

							var that = this;
							this._duAddListener = function(event) {
								that._onDUAdd(event);
							};
							this._duRemoveListener = function(event) {
								that._onDURemove(event);
							};
							this._duDirtyListener = function(event) {
								that._onDUDirty(event);
							};

							var len = layers.length;
							for (var i = 0; i < len; i++) {
								var layer = layers[i];

								var layerRootElement = layer.__createRootElement(this);

								//レイヤーと対応する要素をDOMマネージャに登録
								this._domManager.add(layer, layerRootElement, true);

								//SVGのwidth, heightはSVGAttirubute
								//IEとFirefoxの場合、レイヤー自体のサイズは0x0とし、overflowをvisibleにすることで
								//DOMツリー上の子要素が直接クリックできるようにする。
								//（そうしないとDUをクリックできない）
								//IE11とFirefox50で確認。
								//なお、Chromeの場合はoverflow:visibleにしてもサイズを0x0にすると
								//描画されなくなるため1x1とする。
								$(layerRootElement).css({
									position: 'absolute',
									margin: 0,
									padding: 0,
									width: 1,
									height: 1
								});

								SvgUtil.setAttributes(layerRootElement, {
									overflow: 'visible'
								});

								layer.addEventListener('displayUnitAdd', this._duAddListener);
								layer.addEventListener('displayUnitRemove', this._duRemoveListener);
								layer.addEventListener('displayUnitDirty', this._duDirtyListener);

								//現時点で存在するレイヤー内のDUを描画
								//レイヤー要素はビューのルート要素として先に生成しているため
								//スタンバイマップには入れない
								//（入れてしまうと「このDUに対応するDOMを既に持っているか」という判定がtrueになり
								//renderDisplayUnit()内の処理が不正になる）
								layer.getDisplayUnitAll().forEach(function(du) {
									that._duRenderStandbyMap.set(du, du);
								});
								this.update();

								//先にaddしたレイヤーの方が手前に来るようにする
								//layers配列的にはindexが若い＝手前、DOM的には後の子になるようにする
								this._rootElement.appendChild(layerRootElement);
							}

							this._initForemostSvg();

							//ビューポートが既に移動している状態でinitされた場合に備え
							//ここでレイヤーの位置をアップデート予約しておく（実際の更新はdoUpdate()のタイミングで行われる）
							this._updateLayerScrollPosition();
						},

						/**
						 * @private
						 */
						__onSelectDUStart: function(dragSelectStartPos) {
							var rect = SvgUtil.createElement('rect');
							this._dragSelectOverlayRect = rect;

							rect.className.baseVal = ('stageDragSelectRangeOverlay');
							SvgUtil.setAttributes(rect, {
								x: dragSelectStartPos.x,
								y: dragSelectStartPos.y,
								width: 0,
								height: 0,
								'pointer-events': 'none'
							});

							this._foremostSvgGroup.appendChild(rect);
						},

						/**
						 * @private
						 */
						__onSelectDUMove: function(worldPos, worldWidth, worldHeight) {
							SvgUtil.setAttributes(this._dragSelectOverlayRect, {
								x: worldPos.x,
								y: worldPos.y,
								width: worldWidth,
								height: worldHeight
							});
						},

						/**
						 * @private
						 */
						__onSelectDUEnd: function() {
							$(this._dragSelectOverlayRect).remove();
						},

						/**
						 * @private
						 */
						__onDragDUStart: function(dragSession) {
							var targetDUs = dragSession.getTarget();
							if (!Array.isArray(targetDUs)) {
								targetDUs = [targetDUs];
							}

							this._dragTargetDUInfoMap = new Map();

							var that = this;
							targetDUs.forEach(function(du) {
								var element = du.__renderDOM(that);
								//isVisible=falseをすることでDOMにdisplay:noneがつくので
								//強制的に解除
								$(element).css({
									display: ''
								});

								//DUに対応する、ドラッグ中のみ表示する表層コピーエレメントをマップに保存
								that._dragTargetDUInfoMap.set(du, element);

								var gpos = du.getWorldGlobalPosition();

								SvgUtil.setAttributes(element, {
									x: gpos.x,
									y: gpos.y,
									width: du.width,
									height: du.height,
									'pointer-events': 'none'
								});

								that._foremostSvgGroup.appendChild(element);

								//レイヤーに存在する元々のDUは非表示にする
								var originalDOM = that._domManager.getElement(du);
								if (originalDOM) {
									du._updateActualDisplayStyle(originalDOM);
								}
							});
						},

						/**
						 * @private
						 */
						__onDragDUMove: function(dragSession) {
						//Moveの処理はdoUpdateの中で汎用に行うようになったため、ここでの移動処理は不要
						},

						/**
						 * @private
						 */
						__onDragDUDrop: function(dragSession) {
							var that = this;
							this._dragTargetDUInfoMap.forEach(function(element, du) {
								var originalDOM = that._domManager.getElement(du);
								if (originalDOM) {
									du._updateActualDisplayStyle(originalDOM);
								}
							});

							this._dragTargetDUInfoMap = null;

							//フォアレイヤーのDOMを削除する
							$(this._foremostSvgGroup).empty();

							this.update();
						},

						dispose: function() {
							var that = this;
							this._stage._layers.forEach(function(layer) {
								layer.removeEventListener('displayUnitAdd', that._duAddListener);
								layer.removeEventListener('displayUnitRemove',
										that._duRemoveListener);
								layer
										.removeEventListener('displayUnitDirty',
												that._duDirtyListener);
							});

							this._layerDefsMap.clear();

							this._duRenderStandbyMap.clear();
							this._duDirtyReasonMap.clear();

							$(this._rootElement).remove();
						},

						setSize: function(displayWidth, displayHeight) {
							var row = this._stage._viewCollection.getRow(this.rowIndex);
							row._desiredHeight = displayHeight;

							var col = this._stage._viewCollection.getColumn(this.columnIndex);
							col._desiredWidth = displayWidth;

							this._stage._viewCollection._updateGridRegion();
						},

						getScrollPosition: function() {
							var pos = DisplayPoint.create(this._viewport.displayX,
									this._viewport.displayY);
							return pos;
						},

						scrollTo: function(dispX, dispY) {
							this._scrollTo(dispX, dispY);
						},

						/**
						 * @private
						 * @param isRow
						 * @param desiredDisplayPoint
						 * @param dispVisibleSize
						 * @param dispViewportSize
						 * @param dispVisibleMin
						 * @param dispVisibleMax
						 * @returns
						 */
						_getActualScrollPoint: function(isRow, desiredDisplayPoint,
								dispVisibleSize, dispViewportSize, dispVisibleMin, dispVisibleMax) {

							var dispScrollableSize = dispVisibleSize - dispViewportSize;
							if (dispScrollableSize <= 0 && isFinite(dispVisibleMin)) {
								//現在のスケールにおいて、ビューポートのサイズが可視領域のサイズより大きい
								//＝全てが見えており、かつ可視領域の一番上に張りつかせる
								//→スクロール位置は必ずvisibleRangeの先頭位置になる
								return dispVisibleMin;
							}

							//ビューポートのDisplayサイズが可視領域のDisplayサイズより小さい＝スクロールが可能
							//スクロール可能な最大値は、可視領域の最大からビューポートのサイズを引いた値となる
							var actualPoint = StageUtil.clamp(desiredDisplayPoint, dispVisibleMin,
									dispVisibleMax - dispViewportSize);
							return actualPoint;
						},

						/**
						 * scrollXXX系のメソッドは、最終的に必ずこのメソッドを呼び出している。
						 *
						 * @private
						 * @param dispX
						 * @param dispY
						 */
						_scrollTo: function(dispX, dispY) {
							var oldPos = DisplayPoint.create(this._viewport.displayX,
									this._viewport.displayY);

							var cconv = this.coordinateConverter;

							var visibleRangeX = this.getVisibleRangeX();
							var dispLeft = visibleRangeX.left == null ? -Infinity : cconv
									.toDisplayX(visibleRangeX.left);
							var dispRight = visibleRangeX.right == null ? Infinity : cconv
									.toDisplayX(visibleRangeX.right);

							var actualDispX = this._getActualScrollPoint(false, dispX, this
									.getVisibleWidthOfDisplay(), this._viewport.displayWidth,
									dispLeft, dispRight);

							var visibleRangeY = this.getVisibleRangeY();
							var dispTop = visibleRangeY.top == null ? -Infinity : cconv
									.toDisplayY(visibleRangeY.top);
							var dispBottom = visibleRangeY.bottom == null ? Infinity : cconv
									.toDisplayY(visibleRangeY.bottom);

							var actualDispY = this._getActualScrollPoint(true, dispY, this
									.getVisibleHeightOfDisplay(), this._viewport.displayHeight,
									dispTop, dispBottom);

							var actualDiff = {
								dx: actualDispX - this._viewport.displayX,
								dy: actualDispY - this._viewport.displayY
							};

							if (this._viewport.displayX === actualDispX
									&& this._viewport.displayY === actualDispY) {
								//スクロール位置が現在と全く変わらなかったら何もしない
								return actualDiff;
							}

							this._viewport.scrollTo(actualDispX, actualDispY);

							if (this._inInitialized) {
								//初期化されていない状態では
								//実際のレイヤーは生成されていないので
								//移動処理をしない
								this._updateLayerScrollPosition();
							}

							var newPos = DisplayPoint.create(actualDispX, actualDispY);

							var scrPosChange = {
								oldValue: oldPos,
								newValue: newPos,
								isChanged: true
							};

							var scaleChange = {
								oldValue: {
									x: this._viewport.scaleX,
									y: this._viewport.scaleY
								},
								newValue: {
									x: this._viewport.scaleX,
									y: this._viewport.scaleY
								},
								isChanged: false
							};

							var event = SightChangeEvent.create(this, scrPosChange, scaleChange);
							this.dispatchEvent(event);

							return actualDiff;
						},

						scrollBy: function(displayDx, displayDy) {
							this._scrollBy(displayDx, displayDy);
						},

						/**
						 * @private
						 * @param displayDx
						 * @param displayDy
						 * @returns
						 */
						_scrollBy: function(displayDx, displayDy) {
							if (displayDx === 0 && displayDy === 0) {
								return;
							}

							var dx = this._viewport.displayX + displayDx;
							var dy = this._viewport.displayY + displayDy;
							var actualDiff = this._scrollTo(dx, dy);
							return actualDiff;
						},

						scrollWorldTo: function(worldX, worldY) {
							var dispPos = this._viewport.getDisplayPosition(worldX, worldY);
							this.scrollTo(dispPos.x, dispPos.y);
						},

						scrollWorldBy: function(worldDx, worldDy) {
							if (worldDx === 0 && worldDy === 0) {
								return;
							}

							var dx = this._viewport.worldX + worldDx;
							var dy = this._viewport.worldY + worldDy;
							this.scrollWorldTo(dx, dy);
						},

						getScale: function() {
							var ret = {
								x: this._viewport.scaleX,
								y: this._viewport.scaleY
							};
							return ret;
						},

						/**
						 * このステージの拡大率を設定します。スケール値はワールド座標系に対して設定されます。<br>
						 * つまり、scaleを2にすると、画面上は各オブジェクトが2倍の大きさの大きさで表示されます。<br>
						 * このメソッドを呼び出すことは、すべてのレイヤーのsetScale()に同じ値を設定することと等価です。<br>
						 * ただし、DisplayUnit.setScale()と異なり、拡縮時の中心位置を指定することができます。
						 *
						 * @param scaleX X軸方向の拡大率。nullの場合は現在のまま変更しない。
						 * @param scaleY Y軸方向の拡大率。nullの場合は現在のまま変更しない。
						 * @param displayPageX 拡縮時の中心点のx（ドキュメントを基準とした座標。マウスイベント等のpageXと同じ)
						 * @param displayPageY 拡縮時の中心点のy（仕様はxと同じ）
						 */
						setScale: function(scaleX, scaleY, displayPageX, displayPageY) {
							var scaleRangeX = this.getScaleRangeX();
							var scaleRangeY = this.getScaleRangeY();

							var actualScaleX = StageUtil.clamp(scaleX, scaleRangeX.min,
									scaleRangeX.max);
							var actualScaleY = StageUtil.clamp(scaleY, scaleRangeY.min,
									scaleRangeY.max);

							if (scaleX == null) {
								actualScaleX = this._viewport.scaleX;
							}
							if (scaleY == null) {
								actualScaleY = this._viewport.scaleY;
							}

							if (actualScaleX === this._viewport.scaleX
									&& actualScaleY === this._viewport.scaleY) {
								return;
							}

							if (displayPageX != null || displayPageY != null) {
								//rootOffsetが使われるのは、どちらかの変数が非nullの場合のみ
								var rootOffset = $(this._rootElement).offset();
							}

							var offX, offY;

							if (displayPageX == null) {
								//xが指定されていない場合はこのビューの中心とする
								offX = this._viewport.displayWidth / 2;
							} else {
								offX = displayPageX - rootOffset.left;
							}

							if (displayPageY == null) {
								//Xと同様このビューの中心にする
								offY = this._viewport.displayHeight / 2;
							} else {
								offY = displayPageY - rootOffset.top;
							}

							var scaleCenter = this._viewport.getWorldPositionFromDisplayOffset(
									offX, offY);

							var oldScrollPos = DisplayPoint.create(this._viewport.displayX,
									this._viewport.displayY);
							var oldScaleX = this._viewport.scaleX;
							var oldScaleY = this._viewport.scaleY;

							//一旦VisibleRangeを考慮せずスケールを適用する。
							//これによりviewportのdisplay座標が更新されるので、
							//この値を使ってVisibleRangeの制約を満たすようにスクロールしなおす
							this._viewport.setScale(actualScaleX, actualScaleY, scaleCenter.x,
									scaleCenter.y);

							var cconv = this.coordinateConverter;

							var visibleRangeX = this.getVisibleRangeX();
							var dispLeft = visibleRangeX.left == null ? -Infinity : cconv
									.toDisplayX(visibleRangeX.left);
							var dispRight = visibleRangeX.right == null ? Infinity : cconv
									.toDisplayX(visibleRangeX.right);
							var actualScrollX = this._getActualScrollPoint(false,
									this._viewport.displayX, this.getVisibleWidthOfDisplay(),
									this._viewport.displayWidth, dispLeft, dispRight);

							var visibleRangeY = this.getVisibleRangeY();
							var dispTop = visibleRangeY.top == null ? -Infinity : cconv
									.toDisplayY(visibleRangeY.top);
							var dispBottom = visibleRangeY.bottom == null ? Infinity : cconv
									.toDisplayY(visibleRangeY.bottom);
							var actualScrollY = this._getActualScrollPoint(true,
									this._viewport.displayY, this.getVisibleHeightOfDisplay(),
									this._viewport.displayHeight, dispTop, dispBottom);

							//VisibleRange制約を満たす位置に再度スクロールする
							this._viewport.scrollTo(actualScrollX, actualScrollY);

							var newScrollPos = DisplayPoint.create(actualScrollX, actualScrollY);

							var isScrollPoisitionChanged = true;
							if (oldScrollPos.x === newScrollPos.x
									&& oldScrollPos.y === newScrollPos.y) {
								isScrollPoisitionChanged = false;
							}

							this._updateLayerScrollPosition();

							var scrPosChange = {
								oldValue: oldScrollPos,
								newValue: newScrollPos,
								isChanged: isScrollPoisitionChanged
							};

							var scaleChange = {
								oldValue: {
									x: oldScaleX,
									y: oldScaleY
								},
								newValue: {
									x: actualScaleX,
									y: actualScaleY
								},
								isChanged: true
							};

							var event = SightChangeEvent.create(this, scrPosChange, scaleChange);
							this.dispatchEvent(event);
						},

						getScaleRangeX: function() {
							return this._stage._scaleRangeX;
						},

						setScaleRangeX: function(min, max) {
							var actualMin = StageUtil.clamp(min, ABSOLUTE_SCALE_MIN, null);

							this._stage._scaleRangeX = {
								min: actualMin,
								max: max
							};

							var newScaleX = StageUtil.clamp(this._viewport.scaleX, actualMin, max);

							if (newScaleX != this._viewport.scaleX) {
								this.setScale(newScaleX, null);
							}
						},

						getScaleRangeY: function() {
							return this._stage._scaleRangeY;
						},

						setScaleRangeY: function(min, max) {
							var actualMin = StageUtil.clamp(min, ABSOLUTE_SCALE_MIN, null);

							this._stage._scaleRangeY = {
								min: actualMin,
								max: max
							};

							var newScaleY = StageUtil.clamp(this._viewport.scaleY, actualMin, max);

							if (newScaleY != this._viewport.scaleY) {
								this.setScale(null, newScaleY);
							}
						},

						setVisibleRange: function(worldLeft, worldTop, worldRight, worldBottom) {
							this.setVisibleRangeX(worldLeft, worldRight);
							this.setVisibleRangeY(worldTop, worldBottom);
						},

						getVisibleRangeX: function() {
							var ret = this._stage._viewCollection.getColumn(this.columnIndex)
									.getVisibleRangeX();
							return ret;
						},

						setVisibleRangeX: function(worldLeft, worldRight) {
							this._stage._viewCollection.getColumn(this.columnIndex)
									.setVisibleRangeX(worldLeft, worldRight);
						},

						getVisibleRangeY: function() {
							var ret = this._stage._viewCollection.getRow(this.rowIndex)
									.getVisibleRangeY();
							return ret;
						},

						setVisibleRangeY: function(worldTop, worldBottom) {
							this._stage._viewCollection.getRow(this.rowIndex).setVisibleRangeY(
									worldTop, worldBottom);
						},

						getVisibleHeight: function() {
							var ret = this._stage._viewCollection.getRow(this.rowIndex)
									.getVisibleHeight();
							return ret;
						},

						getVisibleHeightOfDisplay: function() {
							return this._stage._viewCollection.getRow(this.rowIndex)
									.getVisibleHeightOfDisplay();
						},

						getVisibleWidth: function() {
							var ret = this._stage._viewCollection.getColumn(this.columnIndex)
									.getVisibleWidth();
							return ret;
						},

						getVisibleWidthOfDisplay: function() {
							return this._stage._viewCollection.getColumn(this.columnIndex)
									.getVisibleWidthOfDisplay();
						},

						getDefsForLayer: function(layer) {
							var defs = this._layerDefsMap.get(layer);

							if (!defs) {
								var layerElement = this._domManager.getElement(layer);
								var element = document.createElementNS(
										'http://www.w3.org/2000/svg', 'defs');
								layerElement.appendChild(element);

								defs = SVGDefinitions.create(element);
								this._layerDefsMap.set(layer, defs);
							}

							return defs;
						},

						getElementForDisplayUnit: function(displayUnit) {
							if (!displayUnit) {
								throw new Error('DisplayUnitが指定されていません。');
							}
							return this._domManager.getElement(displayUnit);
						},

						/**
						 * 指定された要素がこのビューに属するものかどうかを返します。 ビューのルート要素を指定した場合にもtrueが返ります。
						 *
						 * @param element
						 */
						isElementOwner: function(element) {
							if (this._rootElement === element) {
								//このビューのルート要素そのもの
								return true;
							}

							//TODO 途中に別のStageがある場合にはfalseにする（Stageのネスト対応）

							if (this._rootElement.compareDocumentPosition(element)
									& Node.DOCUMENT_POSITION_CONTAINED_BY) {
								//ルート要素の子要素ならtrue
								return true;
							}
							return false;
						},

						getPagePosition: function() {
							var offset = $(this._rootElement).offset();
							var pos = DisplayPoint.create(offset.left, offset.top);
							return pos;
						},

						/**
						 * @private
						 */
						_updateLayerScrollPosition: function() {
							this._isUpdateLayerScrollPositionRequired = true;
							this.update();
						},

						/**
						 * @private
						 */
						_doUpdateLayerScrollPosition: function() {
							var layers = this._stage._layers;

							for (var i = 0, len = layers.length; i < len; i++) {
								var layer = layers[i];

								//ビューポートの位置はVisibleRangeの制約を満たした状態になっているので
								//改めてVisibleRangeに収まるような計算をする必要はない。
								var scrollX = this._viewport.worldX;
								var scrollY = this._viewport.worldY;

								switch (layer.UIDragScreenScrollDirection) {
								case SCROLL_DIRECTION_XY:
									break;
								case SCROLL_DIRECTION_X:
									scrollY = 0;
									break;
								case SCROLL_DIRECTION_Y:
									scrollX = 0;
									break;
								case SCROLL_DIRECTION_NONE:
								default:
									scrollX = 0;
									scrollY = 0;
									break;
								}

								var dom = this._domManager.getElement(layer);

								//scrollXYはビューポートの位置なので、
								//レイヤーのtranslateにセットする値としては符号を逆にする
								this._updateTransform(dom, -scrollX, -scrollY);
							}

							//フォアレイヤーのスクロール位置も移動させる
							this._updateTransform(this._foremostSvg, -this._viewport.worldX,
									-this._viewport.worldY);
						},

						/*
						 * 線分1-2 と 線分3-4 が交差しているかどうかを判定します。端点で交差する場合もtrueを返します。
						 *
						 * @param x1
						 * @param y1
						 * @param x2
						 * @param y2
						 * @param x3
						 * @param y3
						 * @param x4
						 * @param y4
						 * @returns {Boolean}
						 */
						//						_isLineCrossing: function(x1, y1, x2, y2, x3, y3, x4, y4) {
						//							//参考：http://www5d.biglobe.ne.jp/~tomoya03/shtml/algorithm/Intersection.htm
						//							var ta = (x3 - x4) * (y1 - y3) + (y3 - y4) * (x3 - x1);
						//							var tb = (x3 - x4) * (y2 - y3) + (y3 - y4) * (x3 - x2);
						//							var tc = (x1 - x2) * (y3 - y1) + (y1 - y2) * (x1 - x3);
						//							var td = (x1 - x2) * (y4 - y1) + (y1 - y2) * (x1 - x4);
						//
						//							//端点を含まない場合はイコールを外す
						//							return tc * td <= 0 && ta * tb <= 0;
						//						},
						//
						//						_isRenderRectCrossing: function(edgeDU, leftX, topY, rightX, bottomY) {
						//							var ex1 = edgeDU.x1;
						//							var ey1 = edgeDU.y1;
						//							var ex2 = edgeDU.x2;
						//							var ey2 = edgeDU.y2;
						//
						//							if (this._isLineCrossing(ex1, ey1, ex2, ey2, leftX, topY, rightX, topY)) {
						//								//上辺とエッジが交差している
						//								return true;
						//							} else if (this._isLineCrossing(ex1, ey1, ex2, ey2, leftX, topY, leftX,
						//									bottomY)) {
						//								//左辺と交差している
						//								return true;
						//							} else if (this._isLineCrossing(ex1, ey1, ex2, ey2, leftX, bottomY,
						//									rightX, bottomY)) {
						//								//下辺と交差している
						//								return true;
						//							} else if (this._isLineCrossing(ex1, ey1, ex2, ey2, rightX, bottomY,
						//									rightX, topY)) {
						//								//右辺と交差している
						//								return true;
						//							}
						//							return false;
						//						},
						//MEMO: 最適化の結果、現時点では個別に表示制御しない方がよいので、一旦コードをコメントアウト。
						//ただし、今後DOMを動的に生成・削除する場合には同様のアルゴリズムを実装する可能性があるので
						//現時点ではコードは残しておく。
						//						_updateSystemVisible: function(renderRect, rootDU, includesRoot) {
						//							var duArray;
						//							if (includesRoot === true) {
						//								duArray = [rootDU];
						//							} else {
						//								duArray = [];
						//							}
						//
						//							if (DisplayUnitContainer.isClassOf(rootDU)) {
						//								duArray = rootDU.getDisplayUnitAll(true);
						//							}
						//
						//							var belongingLayer = rootDU._belongingLayer;
						//
						//							var effectiveRenderRect = Rect.create(renderRect.x, renderRect.y,
						//									renderRect.width, renderRect.height);
						//
						//							switch (belongingLayer.UIDragScreenScrollDirection) {
						//							case SCROLL_DIRECTION_X:
						//								//レイヤーがX方向のみ移動可能＝Y方向には移動しないものとして考える
						//								effectiveRenderRect.y = 0;
						//								break;
						//							case SCROLL_DIRECTION_Y:
						//								effectiveRenderRect.x = 0;
						//								break;
						//							case SCROLL_DIRECTION_NONE:
						//								effectiveRenderRect.x = 0;
						//								effectiveRenderRect.y = 0;
						//								break;
						//							}
						//
						//							//エッジの交差判定で使用する、描画領域の4つ角の座標
						//							var rLeft = effectiveRenderRect.x;
						//							var rRight = effectiveRenderRect.x + effectiveRenderRect.width;
						//							var rTop = effectiveRenderRect.y;
						//							var rBottom = effectiveRenderRect.y + effectiveRenderRect.height;
						//
						//							for (var i = 0, len = duArray.length; i < len; i++) {
						//								var du = duArray[i];
						//
						//								var element = this._duidElementMap.get(du.id);
						//
						//								if (!element) {
						//									//対応するDOMが描画されていない場合（可視範囲外である、などの理由で）は無視
						//									continue;
						//								}
						//
						//								if (DisplayUnitContainer.isClassOf(du)) {
						//									//DUコンテナは現状常に表示とする
						//									du._setSystemVisible(true, element);
						//									continue;
						//								} else if (Edge.isClassOf(du)) {
						//									//エッジの場合、表示領域の各辺と線分の交差判定を行い、
						//									//いずれかの辺と交差しているか、
						//									//表示領域にEdgeが完全に内包されている場合のみ描画する
						//
						//									//まず、エッジの両端（＝2つのDU）がビューポート外で、かつ
						//									//両方とも同じサイドかどうかを判定する
						//
						//									//TODO 現状では効果がある場合と逆に計算量が増える場合があり
						//									//かつそれほど大きな効果が見込めないので一旦この判定は行わないようにする
						//
						//									//									var fromDURelPos = this._isOutOfViewport(du._from, rLeft, rTop,
						//									//											rRight, rBottom);
						//									//
						//									//									if (fromDURelPos !== DU_POSITION_INTERSECT) {
						//									//										var toDURelPos = this._isOutOfViewport(du._to, rLeft, rTop,
						//									//												rRight, rBottom);
						//									//										if (fromDURelPos === toDURelPos) {
						//									//											//エッジの両端がともに同じサイドにある場合エッジはビューポートをまたぐことはないので非表示にできる
						//									//											du._setSystemVisible(false, element);
						//									//											continue;
						//									//										}
						//									//									}
						//
						//									//DUの位置関係上エッジがビューポートを交差する可能性があるので
						//									//実際に交差するかどうかを判定
						//
						//									//var edgeRect = Rect.create(du.x, du.y, du.width, du.height);
						//
						//									//									if (this
						//									//											._isRenderRectCrossing(du, rLeft, rTop, rRight, rBottom)
						//									//											|| effectiveRenderRect.contains(edgeRect)) {
						//									if (this._isOutOfViewport(du, rLeft, rTop, rRight, rBottom) === DU_POSITION_INTERSECT) {
						//										du._setSystemVisible(true, element);
						//									} else {
						//										du._setSystemVisible(false, element);
						//									}
						//									continue;
						//								}
						//
						//								/* ---- 以下、通常のDUの場合 ---- */
						//
						//								//あるDUを「表示しない」条件は、描画領域の「外側」にDUがある、つまり
						//								//DUの左右の辺がともに描画領域の左または右にある、もしくは
						//								//DUの上下の辺がともに描画領域の上または下にあること。
						//								//right, bottomは必ずleft, topより大きいと保証されているので
						//								//一部の条件は省略できる
						//								if (this._isOutOfViewport(du, rLeft, rTop, rRight, rBottom)) {
						//									du._setSystemVisible(false, element);
						//								} else {
						//									du._setSystemVisible(true, element);
						//								}
						//							}
						//						},
						//
						/**
						 * 実際に描画を更新します。
						 *
						 * @private
						 * @param renderRect 描画範囲
						 */
						_doUpdate: function(renderRect) {
							if (this._updateAnimationFrameId) {
								//描画が更新されるので、次フレームを待っていた場合は解除
								cancelAnimationFrame(this._updateAnimationFrameId);
							}
							this._updateAnimationFrameId = null;

							var that = this;

							if (this._isUpdateLayerScrollPositionRequired) {
								this._isUpdateLayerScrollPositionRequired = false;
								this._doUpdateLayerScrollPosition();
							}

							var dirtyMap = this._duDirtyReasonMap;

							//前回のアップデートから今回までに新たに追加されたDU、および
							//描画範囲が変更されて新たに描画されることになったDUを処理。
							//なお、shouldRender()の実装によってはこのタイミングでDUが描画されないこともある（可視範囲外等）ので、
							//duRenderStandbyMapにはDUが残る場合もある。よって、このMapはクリアしてはいけない。
							this._duRenderStandbyMap.forEach(function(du) {
								that._renderDisplayUnit(du, renderRect);

								//Addされた後さらにDUに変更が加えられてDirtyの方にも入っている可能性があるが、
								//InitialRenderのタイミングで現在の状態に基づくDUの描画はなされているはずなので
								//Dirtyのマップからは削除する
								dirtyMap['delete'](du);
							});

							//DirtyなDUを処理
							dirtyMap.forEach(function(updateReasonSet, du) {
								var elem = that._domManager.getElement(du);
								if (elem) {
									du.__updateDOM(that, elem, updateReasonSet);
								}

								//ドラッグ中の場合、DU相当の表層コピーエレメントもアップデートする
								if (that._dragTargetDUInfoMap) {
									var foreElem = that._dragTargetDUInfoMap.get(du);
									if (foreElem) {
										//通常のDOMと同様に再描画してもらう。ここで、DUのサイズや位置も変更される
										du.__updateDOM(that, foreElem, updateReasonSet);

										//ただし、位置だけは必ずグローバルポジションに上書きする
										var gpos = du.getWorldGlobalPosition();
										SvgUtil.setAttributes(foreElem, {
											x: gpos.x,
											y: gpos.y
										});
									}
								}
							});
							dirtyMap.clear();
						},

						/**
						 * 描画をアップデートします。isImmediateにtrueを渡さなかった場合、次のアニメーションフレームのタイミングまで描画は遅延されます。
						 *
						 * @param {Boolean} isImmediate アニメーションフレームを待たず、すぐに描画を更新するかどうか。デフォルト：false
						 * @param {Rect} renderRect 描画範囲とする矩形領域。isImmediateがtrueの場合のみ適用されます。
						 */
						update: function(isImmediate, renderRect) {
							if (isImmediate) {
								this._doUpdate(renderRect);
								return;
							}

							if (this._updateAnimationFrameId) {
								//既に次フレームでの描画が予約されていたら何もしない
								return;
							}

							this._updateAnimationFrameId = requestAnimationFrame(this._updateCallWrapper);
						},

						/**
						 * レイヤーではtranslate量にDUのx,yの値を用いる。
						 *
						 * @private
						 * @param worldX
						 * @param worldY
						 */
						_updateTransform: function(element, scrollX, scrollY) {
							var scaleXStr = getNormalizedValueString(this._viewport.scaleX);
							var scaleYStr = getNormalizedValueString(this._viewport.scaleY);
							var tx = getNormalizedValueString(scrollX);
							var ty = getNormalizedValueString(scrollY);

							var transform = h5.u.str.format('scale({0},{1}) translate({2},{3})',
									scaleXStr, scaleYStr, tx, ty);

							//SVGレイヤーの場合はルート要素の下に<g>を一つ持ち、
							//その<g>にtransformを設定する。
							element.firstChild.setAttribute('transform', transform);

							/* 処理ここまで */

							//小数表現を正規化して小数文字列を返す
							function getNormalizedValueString(value) {
								var PRECISION = 10;

								var intPart = Math.floor(value);
								if (value === intPart) {
									//TODO 十分誤差が小さい場合は整数化(あまり極端に整数部が大きくならない前提)
									return '' + intPart;
								}
								var str = value.toString();
								var dotIdx = str.indexOf('.');
								if (dotIdx === -1) {
									return '' + intPart;
								}
								var decstr = str.slice(dotIdx + 1);
								var len = decstr.length > PRECISION ? PRECISION : decstr.length;
								var ret = '' + intPart + '.' + decstr.slice(0, len);
								return ret;
							}
						},

						/**
						 * @private
						 * @param du
						 */
						_renderDisplayUnit: function(du, renderRect, isNested) {
							var domManager = this._domManager;
							var reason = UpdateReasonSet.create(UpdateReasons.INITIAL_RENDER);

							if (DisplayUnitContainer.isClassOf(du)) {
								//コンテナDUは、現状必ず描画する
								if (!domManager.has(du)) {
									var elem = du.__renderDOM(this, reason);
									domManager.add(du, elem);
									//描画待機マップから削除
									this._duRenderStandbyMap['delete'](du);
								}

								if (isNested !== true) {
									domManager.beginBulkAdd(du);
								}

								var children = du.getDisplayUnitAll();
								for (var i = 0, len = children.length; i < len; i++) {
									var child = children[i];
									this._renderDisplayUnit(child, renderRect, true);
								}

								if (isNested !== true) {
									domManager.endBulkAdd();
								}

								return;
							}

							/* ---- 以下はコンテナでないDUの場合 ---- */

							if (domManager.has(du)) {
								//既に描画済みの場合
								return;
							}

							if (!this._shouldRender(du, renderRect)) {
								//今はまだ描画すべきでない場合は何もしない。
								//duRenderStandbyMapに入れておく。
								//（現在の実装では、parent-firstでDUを走査し
								//DOM要素を生成していかないといけないので
								//このrenderDU()メソッドで操作するタイミングで
								//スタンバイマップの追加・削除を制御する必要がある。）
								this._duRenderStandbyMap.set(du, du);
								return;
							}

							//今すぐレンダーする
							var elem = du.__renderDOM(this, reason);
							domManager.add(du, elem);

							//待機リストに入っていたら削除
							this._duRenderStandbyMap['delete'](du);
						},

						/**
						 * このDUを今描画すべきかどうかを返します。
						 *
						 * @private
						 * @param du
						 */
						_shouldRender: function(du, renderRect) {
							if (du.isVisible === false) {
								//ユーザーが明示的にfalseにしているなら描画しない
								return false;
							}

							//Firefoxでは、スクロールの度に描画を増やしていくと
							//判定などの方が重くなりfpsが安定しないので
							//一旦全てのDUは追加時に描画するようにする
							if (!renderRect) {
								if (this._renderRect) {
									renderRect = this._renderRect;
								} else {
									//Viewport.getWorldRect()は毎回インスタンスを生成する。
									//(あまりしたくないが)高速化のため内部変数を直接見る。
									renderRect = this._viewport._worldRect;
								}
							}

							var rLeft = renderRect.x;
							var rTop = renderRect.y;
							var rRight = rLeft + renderRect.width;
							var rBottom = rTop + renderRect.height;

							var belongingLayer = du._belongingLayer;
							switch (belongingLayer.UIDragScreenScrollDirection) {
							case SCROLL_DIRECTION_X:
								//レイヤーがX方向のみ移動可能＝Y方向には移動しないものとして考える
								rTop = 0;
								break;
							case SCROLL_DIRECTION_Y:
								//レイヤーがY方向のみ移動可能
								rLeft = 0;
								break;
							case SCROLL_DIRECTION_NONE:
								//レイヤーは全く移動しない
								rLeft = 0;
								rTop = 0;
								break;
							}

							var duGlobalPos = du.getWorldGlobalPosition();

							if (duGlobalPos.x > rRight) {
								//DUの左端が描画領域の右端より右にある
								return false;
							}

							var duRight = duGlobalPos.x + du.width;
							if (duRight < rLeft) {
								//DUの右端が描画領域の左端より右にある
								return false;
							}

							var duBottom = duGlobalPos.y + du.height;
							if (duBottom < rTop) {
								//DUの下端が描画領域の上端より上にある
								return false;
							}

							if (duGlobalPos.y > rBottom) {
								//DUの上端が描画領域の下端より下にある
								return false;
							}

							return true;
						},

						/**
						 * @private
						 * @param event
						 */
						_onDUDirty: function(event) {
							var du = event.displayUnit;

							var dom = this._domManager.getElement(du);

							var reason = event.reason;

							if (!dom) {
								//対応するDOMが存在しない場合は基本的にはDOMの更新は不要なので何もしない

								if (reason.isVisibilityChanged && du.isVisible) {
									//ただし、isVisibleがfalse⇒trueになった場合、
									//それまで描画対象でなかった(スタンバイリストに入っていた)DUが
									//新規に描画対象になる(可能性がある)ので
									//ビューのアップデートを予約する
									this.update();
								}

								return;
							}

							//もしreasonでZIndexChangedだったら
							//親コンテナでzIndex制約を満たすようにDOMの位置を差し替える。
							//zIndexはDOMManager内でキャッシュを持っているので、
							//都度DOMManager側を更新する必要がある。
							if (reason.isZIndexChanged) {
								var dirtyReason = reason.get(UpdateReasons.Z_INDEX_CHANGE);
								this._domManager.updateElementZIndex(du, dirtyReason.oldValue,
										dirtyReason.newValue);
							}

							//このタイミングですぐには再描画せず、DirtyなDUの集合に理由をマージして待機。
							//次のアニメーションフレームのタイミングで、まとめて描画される。
							var dirtyReason = this._duDirtyReasonMap.get(du);
							if (!dirtyReason) {
								this._duDirtyReasonMap.set(du, reason);
							} else {
								//既にDirtyなDUだった場合は、理由をマージする。
								//なお、同じ理由があった場合、後から追加された方の理由で上書きされる。
								dirtyReason.merge(reason);
							}

							this.update();
						},

						/**
						 * @private
						 * @param event
						 */
						_onDUAdd: function(event) {
							var du = event.displayUnit;
							this._duRenderStandbyMap.set(du, du);
							this.update();
						},

						/**
						 * DUの削除に対応して描画を更新します。現在のところ、DUが削除された場合には、アニメーションフレームを待たずただちに描画を更新します。
						 *
						 * @private
						 * @param event
						 */
						_onDURemove: function(event) {
							this._domManager.remove(event.displayUnit, event.parentDisplayUnit);

							var removedDUs = [event.displayUnit];
							if (DisplayUnitContainer.isClassOf(event.displayUnit)) {
								Array.prototype.push.apply(removedDUs, event.displayUnit
										.getDisplayUnitAll(true));
							}

							//DUが削除されたので、子孫も含め、待機リストから全て削除
							for (var i = 0, len = removedDUs.length; i < len; i++) {
								var du = removedDUs[i];
								this._removeFromUpdateWaitingCache(du);
							}
						},

						/**
						 * @private
						 * @param du
						 */
						_removeFromUpdateWaitingCache: function(du) {
							this._duRenderStandbyMap['delete'](du);
							this._duDirtyReasonMap['delete'](du);
						},

						/**
						 * @private
						 * @param {Number} displayWidth 幅、ディスプレイ座標系
						 */
						_setWidth: function(displayWidth) {
							this._viewport.setDisplaySize(displayWidth,
									this._viewport.displayHeight);

							if (this._rootElement) {
								$(this._rootElement).css({
									width: displayWidth
								});

								//注：レイヤーに対してはサイズを設定してはいけない。
								//レイヤーに設定すると、全てのマウスイベントを最前面のレイヤーで受けてしまうため。
							}

							this.update();
						},

						/**
						 * @private
						 * @param {Number} displayHeight 高さ、ディスプレイ座標系
						 */
						_setHeight: function(displayHeight) {
							this._viewport.setDisplaySize(this._viewport.displayWidth,
									displayHeight);

							if (this._rootElement) {
								$(this._rootElement).css({
									height: displayHeight
								});

								//注：レイヤーに対してはサイズを設定してはいけない。
								//レイヤーに設定すると、全てのマウスイベントを最前面のレイヤーで受けてしまうため。
							}

							this.update();
						}
					}
				};
				return desc;
			});

	RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.Separator',

			field: {
				rowIndex: null,
				columnIndex: null,
				overallRowIndex: null,
				overallColumnIndex: null,
				_isHorizontal: null
			},

			accessor: {
				isHorizontal: {
					get: function() {
						return this._isHorizontal;
					}
				},
				isVertical: {
					get: function() {
						return !this._isHorizontal;
					}
				}
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.Separator
				 */
				constructor: function Separator(isHorizontal) {
					super_.constructor.call(this);
					this.rowIndex = 0;
					this.columnIndex = 0;
					this.overallRowIndex = 0;
					this.overallColumnIndex = 0;

					this._isHorizontal = isHorizontal;
				}
			}
		};
		return desc;
	});

	var GRID_TYPE_CONTENTS = 'contents';
	var GRID_TYPE_SEPARATOR = 'separator';

	var SCROLL_BAR_DISPLAY_MODE_ALWAYS = 3;

	var StageGridRow = RootClass
			.extend(function(super_) {
				var desc = {
					name: 'h5.ui.components.stage.StageGridRow',

					field: {
						_viewCollection: null,
						_type: null,
						_desiredHeight: null,
						_index: null,
						_overallIndex: null,
						_scrollBarMode: null,

						_scrollBarController: null,

						_visibleRangeY: null
					},

					accessor: {
						height: {
							get: function() {
								if (this._type === GRID_TYPE_SEPARATOR) {
									return this._desiredHeight;
								}

								try {
									var firstColumnView = this._viewCollection.getView(this._index,
											0);
									return firstColumnView.height;
								} catch (e) {
									//行にViewがなければ0
									//格子状のグリッドなので、Rowがあれば必ず1つは列が存在するので
									//ここには到達しないはず
									return 0;
								}
							}
						},
						type: {
							get: function() {
								return this._type;
							}
						},
						index: {
							get: function() {
								return this._index;
							}
						},
						overallIndex: {
							get: function() {
								return this._overallIndex;
							}
						},
						scrollBarMode: {
							get: function() {
								return this._scrollBarMode;
							}
						}
					},

					method: {
						/**
						 * @memberOf h5.ui.components.stage.StageGridRow
						 */
						constructor: function StageGridRow(viewCollection, type, index,
								overallIndex, scrollBarMode) {
							super_.constructor.call(this);
							this._viewCollection = viewCollection;
							this._type = type;
							this._desiredHeight = null;
							this._index = index;
							this._overallIndex = overallIndex;
							this._scrollBarMode = scrollBarMode;

							this._visibleRangeY = {
								top: null,
								bottom: null
							};
						},

						getView: function(columnIndex) {
							if (this._type === GRID_TYPE_SEPARATOR) {
								return null; //TODO 例外を出す方が良い？
							}
							return this._viewCollection.getView(this._index, columnIndex);
						},

						getViewAll: function() {
							var numCols = this._viewCollection.numberOfColumns;

							//格子状のグリッドなので、numColの列まで必ずその列に対応するビューが存在する
							var ret = [];
							for (var colIndex = 0; colIndex < numCols; colIndex++) {
								var view = this._viewCollection.getView(this._index, colIndex);
								ret.push(view);
							}
							return ret;
						},

						getScrollY: function() {
							if (this._type === GRID_TYPE_SEPARATOR) {
								//セパレータの場合はスクロールしないので常に0
								return 0;
							}
							var firstColumnView = this._viewCollection.getView(this._index, 0);
							return firstColumnView.getScrollPosition().y;
						},

						setScrollY: function(value) {
							if (this._type === GRID_TYPE_SEPARATOR) {
								//セパレータの場合はスクロールしないので常に0
								return;
							}
							var firstColumnView = this._viewCollection.getView(this._index, 0);
							var scrPos = firstColumnView.getScrollPosition();
							firstColumnView.scrollTo(scrPos.x, value);
						},

						getVisibleRangeY: function() {
							return this._visibleRangeY;
						},

						setVisibleRangeY: function(worldTop, worldBottom) {
							var top, bottom;
							if (worldBottom < worldTop) {
								top = worldBottom;
								bottom = worldTop;
							} else {
								top = worldTop;
								bottom = worldBottom;
							}

							this._visibleRangeY = {
								top: top,
								bottom: bottom
							};

							this._viewCollection._updateGridRegion();
						},

						getVisibleHeight: function() {
							if (!this._isVisibleRangeFinite()) {
								return Infinity;
							}
							var visibleRangeY = this._visibleRangeY;
							return Math.abs(visibleRangeY.bottom - visibleRangeY.top);
						},

						getVisibleHeightOfDisplay: function() {
							if (!this._isVisibleRangeFinite()) {
								return Infinity;
							}
							var ret = this.getView(0).coordinateConverter.toDisplayYLength(this
									.getVisibleHeight());
							return ret;
						},

						getPagePosition: function() {
							//RowのPagePositionは、この行の一番左のビューのPagePositionと一致
							return this._getView(0).getPagePosition();
						},

						/**
						 * @private
						 */
						_getViewportYFromScrollBarPosition: function(value) {
							if (!this._scrollBarController) {
								return 0;
							}
							return value + this._visibleRangeY.top;
						},

						/**
						 * @private
						 */
						_getScrollBarPositionFromScrollY: function(scrollY) {
							if (!this._scrollBarController) {
								return;
							}

							var yMod = scrollY - this._visibleRangeY.top;
							return yMod;
						},

						/**
						 * @private
						 */
						_setScrollBarSetting: function(logicalViewSize, amount) {
							if (!this._scrollBarController) {
								return;
							}
							this._scrollBarController.setScrollSize(logicalViewSize, amount);
						},

						/**
						 * @private
						 */
						_setScrollBarPosition: function(worldY) {
							if (!this._scrollBarController) {
								return;
							}
							var yMod = worldY - this._visibleRangeY.top;
							this._scrollBarController.setScrollPosition(yMod);
						},

						/**
						 * @private
						 */
						_updateScrollBarLogicalValues: function() {
							if (!this._scrollBarController) {
								return;
							}

							var reprView = this.getView(0);

							var worldHeight = reprView._viewport.worldHeight;
							var scrollWorldAmount = this.getVisibleHeight() - worldHeight;
							var worldY = reprView._viewport.worldY;

							this._setScrollBarSetting(worldHeight, scrollWorldAmount);
							this._setScrollBarPosition(worldY);
						},

						/**
						 * @private
						 */
						_setScrollBarTop: function(top) {
							if (!this._scrollBarController) {
								return;
							}

							$(this._scrollBarController.rootElement).css({
								top: top
							});
						},

						/**
						 * @private
						 */
						_setScrollBarHeight: function(height) {
							if (!this._scrollBarController) {
								return;
							}

							//全てのビューでスケールは同じなので代表して一番左のビューでworld-display座標系変換する
							var leftmostView = this.getView(0);

							this._scrollBarController.setBarSize(height);

							var worldHeight = leftmostView._viewport.toWorldY(height);

							var worldAmount = Math.abs(this._visibleRangeY.bottom
									- this._visibleRangeY.top);
							this._scrollBarController.setScrollSize(worldHeight, worldAmount
									- worldHeight);
						},

						/**
						 * @private
						 */
						_showScrollBar: function() {
							if (this._scrollBarController) {
								//既にスクロールバーが出ている場合はこのまま
								return;
							}

							var $root = $('<div class="h5-stage-scrollbar vertical" data-h5-dyn-stage-idx="'
									+ this.index + '"></div>');

							var rightmostView = this
									.getView(this._viewCollection.numberOfColumns - 1);
							var that = this;

							var controller = this._createVScrollBarController($root[0]);
							controller.readyPromise.done(function() {
								this.setBarSize(rightmostView.height);
								that._updateScrollBarLogicalValues();
							});

							controller.setDisplayMode(SCROLL_BAR_DISPLAY_MODE_ALWAYS);

							this._scrollBarController = controller;

							$root.css({
								position: 'absolute',
								top: rightmostView.y,
								right: 0,
								cursor: 'default'
							});

							$root.appendTo(this._viewCollection._stage.rootElement);
						},

						/**
						 * @private
						 */
						_hideScrollBar: function() {
							if (!this._scrollBarController) {
								return;
							}
							var $root = $(this._scrollBarController.rootElement);
							this._scrollBarController.dispose();
							$root.remove();
							this._scrollBarController = null;
						},

						/**
						 * @private
						 */
						_createVScrollBarController: function(rootElement) {
							var controller = h5.core.controller(rootElement,
									h5.ui.components.stage.VerticalScrollBarController);
							return controller;
						},

						/**
						 * @private
						 */
						_isVisibleRangeFinite: function() {
							return this._visibleRangeY.top != null
									&& this._visibleRangeY.bottom != null;
						}
					}
				};
				return desc;
			});

	var StageSeparatorGridRow = StageGridRow.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.StageSeparatorGridRow',

			field: {
				_element: null
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.StageSeparatorGridRow
				 */
				constructor: function StageSeparatorGridRow(viewCollection, index, overallIndex,
						separatorElement) {
					super_.constructor.call(this, viewCollection, GRID_TYPE_SEPARATOR, index,
							overallIndex, SCROLL_BAR_MODE_NONE);

					this._element = separatorElement;
				},

				getElement: function() {
					return this._element;
				}
			}
		};
		return desc;
	});

	var StageGridColumn = RootClass
			.extend(function(super_) {
				var desc = {
					name: 'h5.ui.components.stage.StageGridColumn',

					field: {
						_viewCollection: null,
						_type: null,
						_desiredWidth: null,
						_index: null,
						_overallIndex: null,
						_scrollBarMode: null,
						_scrollBarController: null,
						_visibleRangeX: null
					},

					accessor: {
						type: {
							get: function() {
								return this._type;
							}
						},
						width: {
							get: function() {
								if (this._type === GRID_TYPE_SEPARATOR) {
									return this._desiredWidth;
								}

								try {
									var firstRowView = this._viewCollection.getView(0, this._index);
									return firstRowView.width;
								} catch (e) {
									//行にViewがなければ0
									//格子状のグリッドなので、Rowがあれば必ず1つは列が存在するので
									//ここには到達しないはず
									return 0;
								}
							}
						},
						index: {
							get: function() {
								return this._index;
							}
						},
						overallIndex: {
							get: function() {
								return this._overallIndex;
							}
						},
						scrollBarMode: {
							get: function() {
								return this._scrollBarMode;
							}
						}
					},

					method: {
						/**
						 * @memberOf h5.ui.components.stage.StageGridColumn
						 */
						constructor: function StageGridColumn(viewCollection, type, index,
								overallIndex, scrollBarMode) {
							super_.constructor.call(this);
							this._type = type;
							this._desiredWidth = null;
							this._viewCollection = viewCollection;
							this._index = index;
							this._overallIndex = overallIndex;
							this._scrollBarMode = scrollBarMode;

							this._visibleRangeX = {
								min: null,
								max: null
							};
						},

						getView: function(rowIndex) {
							if (this._type === GRID_TYPE_SEPARATOR) {
								throw new Error('セパレータ行なのでビューはありません。');
							}
							return this._viewCollection.getView(rowIndex, this._index);
						},

						getViewAll: function() {
							var numRows = this._viewCollection.numberOfRows;

							//格子状のグリッドなので、numRowsの行まで必ず対応するビューが存在する
							var ret = [];
							for (var rowIndex = 0; rowIndex < numRows; rowIndex++) {
								var view = this._viewCollection.getView(rowIndex, this._index);
								ret.push(view);
							}
							return ret;
						},

						getScrollX: function() {
							if (this._type === GRID_TYPE_SEPARATOR) {
								//セパレータの場合はスクロールしないので常に0
								return 0;
							}
							var firstView = this._viewCollection.getView(0, this._index);
							return firstView.getScrollPosition().x;
						},

						setScrollX: function(value) {
							if (this._type === GRID_TYPE_SEPARATOR) {
								//セパレータの場合はスクロールしないので常に0
								return;
							}
							var firstView = this._viewCollection.getView(0, this._index);
							var scrPos = firstView.getScrollPosition();
							//スクロール位置は伝播して同じ行のビューは全て同じscroll-yになる
							firstView.scrollTo(value, scrPos.y);
						},

						getVisibleRangeX: function() {
							return this._visibleRangeX;
						},

						setVisibleRangeX: function(worldLeft, worldRight) {
							var left, right;
							if (worldRight < worldLeft) {
								left = worldRight;
								right = worldLeft;
							} else {
								left = worldLeft;
								right = worldRight;
							}

							this._visibleRangeX = {
								left: left,
								right: right
							};

							this._viewCollection._updateGridRegion();
						},


						getVisibleWidth: function() {
							if (!this._isVisibleRangeFinite()) {
								return Infinity;
							}
							var visibleRangeX = this._visibleRangeX;
							return Math.abs(visibleRangeX.right - visibleRangeX.left);
						},

						getVisibleWidthOfDisplay: function() {
							if (!this._isVisibleRangeFinite()) {
								return Infinity;
							}
							var ret = this.getView(0).coordinateConverter.toDisplayXLength(this
									.getVisibleWidth());
							return ret;
						},

						getPagePosition: function() {
							//列のPagePositionは一番上のビューのPagePositionに一致
							return this.getView(0).getPagePosition();
						},

						/**
						 * @private
						 */
						_isVisibleRangeFinite: function() {
							var ret = this._visibleRangeX.left != null
									&& this._visibleRangeX.right != null;
							return ret;
						},

						/**
						 * @private
						 */
						_getViewportXFromScrollBarPosition: function(value) {
							if (!this._scrollBarController) {
								return 0;
							}
							return value + this._visibleRangeX.left;
						},

						/**
						 * @private
						 */
						_setScrollBarLeft: function(left) {
							if (!this._scrollBarController) {
								return;
							}

							$(this._scrollBarController.rootElement).css({
								left: left
							});
						},

						/**
						 * @private
						 */
						_getScrollBarPositionFromScrollX: function(scrollX) {
							if (!this._scrollBarController) {
								return;
							}

							var xMod = scrollX - this._visibleRangeX.left;
							return xMod;
						},

						/**
						 * @private
						 */
						_setScrollBarSetting: function(logicalViewSize, amount) {
							if (!this._scrollBarController) {
								return;
							}
							this._scrollBarController.setScrollSize(logicalViewSize, amount);
						},

						/**
						 * @private
						 */
						_updateScrollBarLogicalValues: function() {
							if (!this._scrollBarController) {
								return;
							}

							var reprView = this.getView(0);

							var worldWidth = reprView._viewport.worldWidth;
							var scrollWorldAmount = this.getVisibleWidth() - worldWidth;
							var worldX = reprView._viewport.worldX;

							this._setScrollBarSetting(worldWidth, scrollWorldAmount);
							this._setScrollBarPosition(worldX);
						},

						/**
						 * @private
						 */
						_setScrollBarPosition: function(worldX) {
							if (!this._scrollBarController) {
								return;
							}
							var xMod = worldX - this._visibleRangeX.left;
							this._scrollBarController.setScrollPosition(xMod);
						},

						/**
						 * @private
						 */
						_setScrollBarWidth: function(width) {
							if (!this._scrollBarController) {
								return;
							}

							var topmostView = this.getView(0);

							this._scrollBarController.setBarSize(width);

							var worldVisibleXLen = Math.abs(this._visibleRangeX.right
									- this._visibleRangeX.left);
							var worldWidth = topmostView._viewport.toWorldX(width);

							this._scrollBarController.setScrollSize(worldWidth, worldVisibleXLen
									- worldWidth);
						},

						/**
						 * @private
						 */
						_showScrollBar: function() {
							if (this._scrollBarController) {
								//既にスクロールバーが出ている場合はこのまま
								return;
							}

							var bottommostView = this
									.getView(this._viewCollection.numberOfRows - 1);

							var $root = $('<div class="h5-stage-scrollbar horizontal" data-h5-dyn-stage-idx="'
									+ this.index + '"></div>');
							$root.css({
								position: 'absolute',
								left: bottommostView.x,
								width: this.width,
								height: SCROLL_BAR_THICKNESS,
								bottom: 0,
								cursor: 'default'
							});

							this._scrollBarController = this._createHScrollBarController($root[0]);

							var that = this;

							this._scrollBarController.readyPromise.done(function() {
								this.setBarSize(bottommostView.width);
								that._updateScrollBarLogicalValues();
							});

							this._scrollBarController
									.setDisplayMode(SCROLL_BAR_DISPLAY_MODE_ALWAYS);

							$root.appendTo(this._viewCollection._stage.rootElement);
						},

						/**
						 * @private
						 */
						_hideScrollBar: function() {
							if (!this._scrollBarController) {
								return;
							}
							var $root = $(this._scrollBarController.rootElement);
							this._scrollBarController.dispose();
							$root.remove();
							this._scrollBarController = null;
						},

						/**
						 * @private
						 */
						_createHScrollBarController: function(rootElement) {
							var controller = h5.core.controller(rootElement,
									h5.ui.components.stage.HorizontalScrollBarController);
							return controller;
						},

					}
				};
				return desc;
			});

	var StageSeparatorGridColumn = StageGridColumn.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.StageSeparatorGridColumn',

			field: {
				_element: null
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.StageSeparatorGridColumn
				 */
				constructor: function StageSeparatorGridColumn(viewCollection, index, overallIndex,
						separatorElement) {
					super_.constructor.call(this, viewCollection, GRID_TYPE_SEPARATOR, index,
							overallIndex, SCROLL_BAR_MODE_NONE);

					this._element = separatorElement;
				},

				getElement: function() {
					return this._element;
				}
			}
		};
		return desc;
	});

	var SCROLL_BAR_THICKNESS = 17;
	var SCROLL_BAR_MODE_NONE = 'none';
	var SCROLL_BAR_MODE_ALWAYS = 'always';

	var GridStageViewCollection = RootClass
			.extend(function(super_) {

				function $createGridSeparator(index, isHorizontal, thickness, pos) {
					var $sep = $('<div data-stage-dyn-sep-idx="' + index
							+ '" class="stageGridSeparator"></div>');

					if (isHorizontal) {
						$sep.addClass('horizontal'); //TODO 効率化
						$sep.css({
							position: 'absolute',
							width: '100%',
							height: thickness,
							top: pos
						});
					} else {
						$sep.addClass('vertical');
						$sep.css({
							position: 'absolute',
							width: thickness,
							height: '100%',
							left: pos
						});
					}

					return $sep;
				}

				var DEFAULT_GRID_SEPARATOR_THICKNESS = 4;

				var desc = {
					name: 'h5.ui.components.stage.GridStageViewCollection',

					field: {
						/**
						 * このコレクションが所属するStage
						 */
						_stage: null,

						/** このグリッド全体の幅 */
						_width: null,

						/** このグリッド全体の高さ */
						_height: null,

						/**
						 * @private setActiveView()で設定したビューを、UI操作に関係なく常にアクティブなビューとするかどうか。
						 */
						_isForceActive: null,

						/**
						 * @private ビューの集合。"行番号_列番号" -> Viewのマップ
						 */
						_viewMap: null,

						_numberOfOverallRows: null,
						_numberOfOverallColumns: null,

						_numberOfRows: null,
						_numberOfColumns: null,

						_numberOfRowSeparators: null,
						_numberOfColumnSeparators: null,

						/** 行オブジェクトの配列 */
						_rows: null,

						/** 列オブジェクトの配列 */
						_columns: null,

						/** アクティブビュー */
						_activeView: null,

						_view_sightChangeListener: null,

						_draggingTargetDUVisibleMap: null,

						_isSightChangePropagationSuppressed: null,

						_isTriggerUnifiedSightChangeSuppressed: null,

						_sightChangeEvents: null,

						_isAutoInitView: null
					},

					accessor: {
						numberOfOverallRows: {
							get: function() {
								return this._numberOfOverallRows;
							}
						},
						numberOfOverallColumns: {
							get: function() {
								return this._numberOfOverallColumns;
							}
						},

						numberOfRows: {
							get: function() {
								return this._numberOfRows;
							}
						},
						numberOfColumns: {
							get: function() {
								return this._numberOfColumns;
							}
						},
						numberOfRowSeparators: {
							get: function() {
								return this._numberOfRowSeparators;
							}
						},
						numberOfColumnSeparators: {
							get: function() {
								return this._numberOfColumnSeparators;
							}
						}
					},

					method: {
						/**
						 * @memberOf h5.ui.components.stage.GridStageViewCollection
						 */
						constructor: function GridStageViewCollection(stage) {
							super_.constructor.call(this);
							this._stage = stage;

							// 行番号 -> { 列番号 -> StageView } という二次元マップ
							this._viewMap = {};

							this._width = 0;
							this._height = 0;

							this._isAutoInitView = true;

							//初期状態では「何もない」ことにする
							this._numberOfOverallRows = 0;
							this._numberOfOverallColumns = 0;
							this._numberOfRows = 0;
							this._numberOfColumns = 0;
							this._numberOfRowSeparators = 0;
							this._numberOfColumnSeparators = 0;

							this._isSightChangePropagationSuppressed = false;

							this._isTriggerUnifiedSightChangeSuppressed = false;

							this._rows = [];
							this._columns = [];

							var that = this;
							this._view_sightChangeListener = function(event) {
								that._onSightChange(event);
							};
						},

						initView: function() {
							this.getViewAll().forEach(function(v) {
								v.init();
							});
						},

						/**
						 * 指定された位置のStageViewを取得します。不正な位置を指定した場合は例外が発生します。一番左上は(0, 0)になります。
						 *
						 * @param rowIndex 行番号（画面上から順に連番、0オリジン）
						 * @param columnIndex 列番号（画面左から順に連番、0オリジン）
						 */
						getView: function(rowIndex, columnIndex) {
							return this._getView(this._viewMap, rowIndex, columnIndex);
						},

						/**
						 * @private
						 */
						_getView: function(viewMap, rowIndex, columnIndex) {
							var row = viewMap[rowIndex];
							if (!row) {
								throw new Error('指定された行にはViewはありません。 rowIndex = ' + rowIndex);
							}

							var view = row[columnIndex];
							if (!view) {
								throw new Error('指定された位置にはViewはありません。');
							}

							return view;
						},

						getViewAll: function() {
							var ret = [];

							var that = this;
							Object.keys(this._viewMap).forEach(function(rowIndex, index, array) {
								var row = that._viewMap[rowIndex];
								Object.keys(row).forEach(function(columnIndex, idx, ary) {
									ret.push(row[columnIndex]);
								});
							});

							return ret;
						},

						/**
						 * 現在アクティブなStageViewを取得します。
						 */
						getActiveView: function() {
							return this._activeView;
						},

						/**
						 * アクティブなStageViewを設定します。
						 *
						 * @param stageView アクティブにするStageView
						 * @param force 指定されたビューをUI操作に関係なく常にアクティブなビューとするかどうか。デフォルト：false。
						 */
						setActiveView: function(stageView, force) {
							//このコレクションが保持しているViewかどうかはチェックしていない
							this._activeView = stageView;
							this._isForceActive = force === true;
						},

						getRow: function(index) {
							var contentsRows = this.getRows();
							return contentsRows[index];
						},

						getRows: function() {
							var ret = [];

							var rows = this._rows;
							for (var i = 0, len = rows.length; i < len; i++) {
								var row = rows[i];
								if (row.type === GRID_TYPE_CONTENTS) {
									ret.push(row);
								}
							}

							return ret;
						},

						getRowsOfAllTypes: function() {
							return this._rows;
						},

						getColumn: function(index) {
							var cols = this.getColumns();
							return cols[index];
						},

						getColumns: function() {
							var ret = [];

							var cols = this._columns;
							for (var i = 0, len = cols.length; i < len; i++) {
								var col = cols[i];
								if (col.type === GRID_TYPE_CONTENTS) {
									ret.push(col);
								}
							}

							return ret;
						},

						getColumnsOfAllTypes: function() {
							return this._columns;
						},

						update: function(isImmediate) {
							this.getViewAll().forEach(function(v) {
								v.update(isImmediate);
							});
						},

						/**
						 * @private
						 */
						_clear: function(andDisposeView) {
							var views = this.getViewAll();

							this.getRows().forEach(function(row) {
								row._hideScrollBar();
							});

							this.getColumns().forEach(function(col) {
								col._hideScrollBar();
							});

							this._width = 0;
							this._height = 0;

							this._numberOfOverallRows = 0;
							this._numberOfOverallColumns = 0;
							this._numberOfRows = 0;
							this._numberOfColumns = 0;
							this._numberOfRowSeparators = 0;
							this._numberOfColumnSeparators = 0;

							this._rows = [];
							this._columns = [];

							this._isSightChangePropagationSuppressed = false;

							this._activeView = null;
							this._viewMap = {};

							var that = this;
							views.forEach(function(v) {
								v
										.removeEventListener('sightChange',
												that._view_sightChangeListener);

								if (andDisposeView === true) {
									v.dispose();
								}
							});
						},

						/**
						 * @private
						 */
						_addView: function(view, rowIndex, columnIndex) {
							var rowMap = this._viewMap[rowIndex];
							if (!rowMap) {
								rowMap = {};
								this._viewMap[rowIndex] = rowMap;
							}
							rowMap[columnIndex] = view;
							view._rowIndex = rowIndex;
							view._columnIndex = columnIndex;

							view.addEventListener('sightChange', this._view_sightChangeListener);
						},

						/**
						 * @private
						 */
						_makeGrid: function(horizontalSplitDefinitions, verticalSplitDefinitions,
								rootWidth, rootHeight) {
							//セパレータは一旦削除し、グリッド構成時に改めて作成
							$(this._stage.rootElement).find('.stageGridSeparator').remove();

							//ビューを使いまわせるように直前のマップと行数・列数を保持しておく
							var oldViewMap = this._viewMap;
							var oldNumOfRows = this.numberOfRows;
							var oldNumOfCols = this.numberOfColumns;
							var oldViews = this.getViewAll();
							var oldActiveView = this.getActiveView();

							//内部状態をクリア
							this._clear();

							if (rootWidth != null) {
								this._width = rootWidth;
							}

							if (rootHeight != null) {
								this._height = rootHeight;
							}

							if (!horizontalSplitDefinitions) {
								horizontalSplitDefinitions = [{}];
							}

							var numOfRowSeps = 0;
							var numOfRows = 0;
							var rows = [];

							var totalHeight = 0;

							var hDefsLen = horizontalSplitDefinitions.length;
							for (var rowOverallIndex = 0; rowOverallIndex < hDefsLen; rowOverallIndex++) {
								var def = horizontalSplitDefinitions[rowOverallIndex];
								var stageGridRow;
								if (def.type === GRID_TYPE_SEPARATOR) {
									//セパレータは縦・横にまたがって作るので、このループの中で作ってしまう
									//セパレータにはoverallIndexを持たせる
									var desiredHeight = def.height != null ? def.height
											: DEFAULT_GRID_SEPARATOR_THICKNESS;
									var $separator = $createGridSeparator(rowOverallIndex, true,
											desiredHeight, totalHeight);

									$separator.appendTo(this._stage.rootElement);

									stageGridRow = StageSeparatorGridRow.create(this, numOfRowSeps,
											rowOverallIndex, $separator[0]);
									stageGridRow._desiredHeight = desiredHeight;

									numOfRowSeps++;
								} else {
									var scrollBarMode = def.scrollBarMode === 'always' ? SCROLL_BAR_MODE_ALWAYS
											: SCROLL_BAR_MODE_NONE;

									stageGridRow = StageGridRow.create(this, GRID_TYPE_CONTENTS,
											numOfRows, rowOverallIndex, scrollBarMode);
									stageGridRow._desiredHeight = def.height;

									numOfRows++;
								}
								rows.push(stageGridRow);

								totalHeight += stageGridRow._desiredHeight ? stageGridRow._desiredHeight
										: 0;
							}

							if (!verticalSplitDefinitions) {
								verticalSplitDefinitions = [{}];
							}

							var numOfColSeps = 0;
							var numOfCols = 0;
							var cols = [];
							var totalWidth = 0;

							var vDefsLen = verticalSplitDefinitions.length;
							for (var colOverallIndex = 0; colOverallIndex < vDefsLen; colOverallIndex++) {
								var def = verticalSplitDefinitions[colOverallIndex];
								var stageGridCol;
								if (def.type === GRID_TYPE_SEPARATOR) {
									//セパレータは縦・横にまたがって作るので、このループの中で作ってしまう
									//セパレータにはoverallIndexを持たせる
									var desiredWidth = def.width != null ? def.width
											: DEFAULT_GRID_SEPARATOR_THICKNESS;

									var $separator = $createGridSeparator(colOverallIndex, false,
											desiredWidth, totalWidth);

									$separator.appendTo(this._stage.rootElement);

									stageGridCol = StageSeparatorGridColumn.create(this,
											numOfColSeps, colOverallIndex, $separator[0]);
									stageGridCol._desiredWidth = desiredWidth;

									numOfColSeps++;
								} else {
									var scrollBarMode = def.scrollBarMode === 'always' ? SCROLL_BAR_MODE_ALWAYS
											: SCROLL_BAR_MODE_NONE;

									stageGridCol = StageGridColumn.create(this, GRID_TYPE_CONTENTS,
											numOfCols, colOverallIndex, scrollBarMode);
									stageGridCol._desiredWidth = def.width;

									numOfCols++;
								}
								cols.push(stageGridCol);

								totalWidth += stageGridCol._desiredWidth ? stageGridCol._desiredWidth
										: 0;
							}

							var reusedViews = [];

							var totalHeight = 0;
							var rowIndex = 0;

							//格子状のグリッドのViewとセパレータのDOMを作成
							for (var hDefIndex = 0; hDefIndex < hDefsLen; hDefIndex++) {
								var hDef = horizontalSplitDefinitions[hDefIndex];
								var row = rows[hDefIndex];

								if (hDef.type === GRID_TYPE_SEPARATOR) {
									totalHeight += row._desiredHeight ? row._desiredHeight : 0;
									continue;
								}

								var totalWidth = 0;
								var colIndex = 0;

								for (var vDefIndex = 0; vDefIndex < vDefsLen; vDefIndex++) {
									var vDef = verticalSplitDefinitions[vDefIndex];
									var col = cols[vDefIndex];

									if (vDef.type === GRID_TYPE_SEPARATOR) {
										totalWidth += col._desiredWidth ? col._desiredWidth : 0;
										continue;
									}

									var theView = null;

									if (rowIndex < oldNumOfRows && colIndex < oldNumOfCols) {
										//今回の位置と同じ位置にビューがあれば再利用する
										theView = this._getView(oldViewMap, rowIndex, colIndex);
										reusedViews.push(theView);
									} else {
										//新規にビューを作成する
										theView = StageView.create(this._stage);
										if (this._isAutoInitView) {
											theView.init();
										}
									}

									this._addView(theView, rowIndex, colIndex);

									totalWidth += col._desiredWidth ? col._desiredWidth : 0;
									colIndex++;
								}

								totalHeight += row._desiredHeight ? row._desiredHeight : 0;
								rowIndex++;
							}

							//再利用されなかったViewを破棄
							oldViews.filter(function(view) {
								return reusedViews.indexOf(view) === -1;
							}).forEach(function(v) {
								v.dispose();
							});

							//新しい状態をセット
							this._numberOfOverallRows = hDefsLen;
							this._numberOfRows = numOfRows;
							this._numberOfRowSeparators = numOfRowSeps;
							this._rows = rows;

							this._numberOfOverallColumns = vDefsLen;
							this._numberOfColumns = numOfCols;
							this._numberOfColumnSeparators = numOfColSeps;
							this._columns = cols;

							/* *** ここまでで、新しいグリッド構造とビューインスタンスの生成が完了 *** */
							/* *** 以下で、スケールやサイズを調整、およびスクロールバーの生成 *** */

							//もしoldActiveViewがあれば、それのスケールを維持する。
							//それがなければ、一番左上のスケールを維持する。
							var newScale = this.getView(0, 0).getScale();
							if (oldActiveView) {
								newScale = oldActiveView.getScale();
							}

							//ループで各ビューのスケール・スクロール位置を個別に設定していくので
							//あるビューのsightChangeを他に反映させるのは抑制する
							this._isSightChangePropagationSuppressed = true;

							//グリッド構造の生成（変更）中は、sightChangeイベントは発生させない。
							//グリッド構造が変更されるということは、「今あるビューのビューポートが変化した」のではなく
							//そもそもビュー自体が再生成された、という意味にしたいため。
							//そのため、ユーザーはstructureChangeイベントが来たら
							//ビューのスクロール位置やスケールなどは全て変わっている可能性があると考える必要がある。
							this._isTriggerUnifiedSightChangeSuppressed = true;

							this._updateGridRegion();

							//TODO forceActive指定があればそのViewをアクティブにする
							var topLeftView = this.getView(0, 0);
							this.setActiveView(topLeftView);

							//全てのビューのスケールを合わせる
							for (var rowIndex = 0, rowLen = rows.length; rowIndex < rowLen; rowIndex++) {
								var row = rows[rowIndex];

								if (row.type === GRID_TYPE_SEPARATOR) {
									continue;
								}

								var views = row.getViewAll();

								var leftmostView = views[0];
								leftmostView.setScale(newScale.x, newScale.y);

								var leftmostScrollY = leftmostView.getScrollPosition().y;

								//同じ行の各ビューのスクロールY座標を、一番左のビューに合わせる
								for (var idx = 1, vLen = views.length; idx < vLen; idx++) {
									var view = views[idx];
									view.setScale(newScale.x, newScale.y);
									var vScrPos = view.getScrollPosition();
									view.scrollTo(vScrPos.x, leftmostScrollY);
								}

								//								if (hDef.scrollRangeX) {
								//									theView.setScrollRangeX(hDef.scrollRangeX.min,
								//											hDef.scrollRangeX.max);
								//									var scrPos = theView.getScrollPosition();
								//									theView.scrollTo(hDef.scrollRangeX.min, scrPos.y);
								//								}
								//
								//								if (hDef.scrollRangeY) {
								//									theView.setScrollRangeY(hDef.scrollRangeY.min,
								//											hDef.scrollRangeY.max);
								//									var scrPos = theView.getScrollPosition();
								//									theView.scrollTo(scrPos.x, hDef.scrollRangeY.min);
								//								}
								//
								//								if (vDef.scrollRangeX) {
								//									theView.setScrollRangeX(vDef.scrollRangeX.min,
								//											vDef.scrollRangeX.max);
								//									var scrPos = theView.getScrollPosition();
								//									theView.scrollTo(vDef.scrollRangeX.min, scrPos.y);
								//								}
								//
								//								if (vDef.scrollRangeY) {
								//									theView.setScrollRangeY(vDef.scrollRangeY.min,
								//											vDef.scrollRangeY.max);
								//									theView.scrollTo(scrPos.x, vDef.scrollRangeY.min);
								//								}

								//this._setRowScrollBarMode(row, row.scrollBarMode);
							}

							//スケールは行ループで設定済みなので列ループでは行う必要はない
							for (var colIndex = 0, colLen = cols.length; colIndex < colLen; colIndex++) {
								var col = cols[colIndex];

								if (col.type === GRID_TYPE_SEPARATOR) {
									continue;
								}

								var views = col.getViewAll();

								var topmostView = views[0];
								var topmostScrollX = topmostView.getScrollPosition().x;

								//同じ列の各ビューのスクロールX座標を、一番上のビューに合わせる
								for (var idx = 1, vLen = views.length; idx < vLen; idx++) {
									var view = views[idx];
									var vScrPos = view.getScrollPosition();
									view.scrollTo(topmostScrollX, vScrPos.y);
								}

								//this._setColumnScrollBarMode(col, col.scrollBarMode);
							}

							this._isSightChangePropagationSuppressed = false;
							this._sightChangeEvents = null;

							this._isTriggerUnifiedSightChangeSuppressed = false;
						},

						/**
						 * @private
						 */
						_updateGridRegion: function() {
							this._updateGridRegionRow();
							this._updateGridRegionColumn();
						},

						/**
						 * @private
						 */
						_willHScrollBarShow: function() {
							var columns = this.getColumns();
							for (var i = 0, len = columns.length; i < len; i++) {
								var column = columns[i];
								if (column._scrollBarMode !== SCROLL_BAR_MODE_NONE
										&& column._isVisibleRangeFinite()) {
									return true;
								}
							}
							return false;
						},

						/**
						 * @private
						 */
						_isHScrollBarShow: function() {
							//厳密には「出る可能性がある」と「今出ている」は異なる。
							//こちらは「今出ているかどうか」を表す。ただし今はalways/noneだけなのでこれでよい。
							return this._willHScrollBarShow();
						},

						/**
						 * @private
						 */
						_willVScrollBarShow: function() {
							var rows = this.getRows();
							for (var i = 0, len = rows.length; i < len; i++) {
								var row = rows[i];
								if (row._scrollBarMode !== SCROLL_BAR_MODE_NONE
										&& row._isVisibleRangeFinite()) {
									return true;
								}
							}
							return false;
						},

						/**
						 * @private
						 */
						_isVScrollBarShow: function() {
							return this._willVScrollBarShow();
						},

						/**
						 * リージョンの調整に先立ち、VisibleRange制約をチェックして可能な限りその制約を満たすように調整します。
						 *
						 * @private
						 */
						_preadjust: function(isRow) {
							var availableContentsSize = this._getAvailableContentsSize(isRow);

							var unadjustedLines = [];

							/* desiredSizeがVisibleSizeよりも大きいラインについて、可能な限り
							 * VisibleSizeに保つようにする
							 */
							var lines = isRow ? this.getRowsOfAllTypes() : this
									.getColumnsOfAllTypes();
							for (var i = 0, len = lines.length; i < len; i++) {
								var line = lines[i];

								if (line.type === GRID_TYPE_SEPARATOR) {
									continue;
								}

								var isLineSizeAdjusted = false;

								if (line._isVisibleRangeFinite()) {
									//コンテンツビューでdesiredSizeがVisibleRangeより小さく指定されていた場合、
									//VisibleRangeとdesiredSizeの差が残りの利用可能サイズより多ければ
									//desiredSizeをVisibleRangeにする
									var desiredSize = isRow ? line._desiredHeight
											: line._desiredWidth;
									var visibleSize = isRow ? line.getVisibleHeightOfDisplay()
											: line.getVisibleWidthOfDisplay();

									var diff = desiredSize - visibleSize;
									if (diff > 0 && diff <= availableContentsSize) {
										if (isRow) {
											line._desiredHeight = visibleSize;
										} else {
											line._desiredWidth = visibleSize;
										}

										isLineSizeAdjusted = true;

										//VisibleRangeに調整したビューについて
										//上書きしたサイズを引く。
										//このループが終わると、
										//availableContentsSizeの値は
										//調整を行わなかったビューで使えるサイズの合計値となるので、
										//2度目のループで再調整をしないビューのサイズを準に引いていって
										//再調整をしなかった最後のビューに
										//残ったavailableContentsSizeを強制的に適用する。
										//これにより、後ろの行・列にあるかどうかに関わらず
										//可能な限りVisibleRange制約を満たしながらdesiredSizeを決定できる。
										availableContentsSize -= visibleSize;
									}
								}

								if (!isLineSizeAdjusted) {
									unadjustedLines.push(line);
								}
							}

							/* 2nd pass: 制約のために調整しなかったラインについてサイズ調整する */
							for (var i = 0, len = unadjustedLines.length; i < len; i++) {
								//unadjustedLinesは必ずコンテンツビューのみを含む
								var line = unadjustedLines[i];

								var desiredSize = isRow ? line._desiredHeight : line._desiredWidth;
								var visibleSize = isRow ? line.getVisibleHeightOfDisplay() : line
										.getVisibleWidthOfDisplay();
								var diff = desiredSize - visibleSize;

								if (line._isVisibleRangeFinite() && diff > 0
										&& diff <= availableContentsSize) {
									continue;
								}

								if (i === len - 1) {
									//最後のラインは必ずコンテンツビューという前提
									//最後のラインに、残ったサイズ全てを割り当てる
									if (isRow) {
										line._desiredHeight = availableContentsSize;
									} else {
										line._desiredWidth = availableContentsSize;
									}
								} else {
									availableContentsSize -= line._desiredHeight;
								}
							}
						},

						/**
						 * @private
						 */
						_getAvailableContentsSize: function(isRow) {
							var totalSeparatorSize = 0;
							var lines = isRow ? this.getRowsOfAllTypes() : this
									.getColumnsOfAllTypes();
							lines.forEach(function(r) {
								if (r.type === GRID_TYPE_SEPARATOR) {
									totalSeparatorSize += isRow ? r.height : r.width;
								}
							});
							var ret = isRow ? this._height : this._width;
							ret -= totalSeparatorSize;
							if (isRow) {
								//Y方向のコンテンツビューの高さを求めるので、
								//「画面下に水平スクロールバーが出ているかどうか」で
								//スクロールバーのサイズを引くかどうかを判定する
								if (this._isHScrollBarShow()) {
									ret -= SCROLL_BAR_THICKNESS;
								}
							} else {
								if (this._isVScrollBarShow()) {
									ret -= SCROLL_BAR_THICKNESS;
								}
							}
							return ret;
						},

						/**
						 * @private
						 */
						_updateGridRegionRow: function() {
							this._preadjust(true);

							var totalY = 0;

							var that = this;

							this.getRowsOfAllTypes().forEach(
									function(row) {
										if (row.type === GRID_TYPE_SEPARATOR) {
											var sepTop = totalY;
											//セパレータがビューの範囲を超えないようにする
											if (totalY > that._height - row._desiredHeight) {
												sepTop = that._height - row._desiredHeight;
												if (sepTop < 0) {
													//ただしビューの高さがセパレータの高さよりも小さい場合はビューの上端＝セパレータの上端とする
													sepTop = 0;
												}
											}

											var $separator = $(row.getElement());
											$separator.css('top', sepTop);
											totalY += row._desiredHeight;
											return;
										}

										var actualHeight = 0;
										if (row.overallIndex + 1 === that.numberOfOverallRows) {
											//最後の行は、制約を無視して残りの高さを設定する
											actualHeight = that._height - totalY;

											if (that._willHScrollBarShow()) {
												//水平スクロールバーが下端に出る場合には、その分一番下の行のビューの高さを減らしておく
												actualHeight -= SCROLL_BAR_THICKNESS;
											}
										} else {
											//実際のビューの高さは「無限」はあり得ないのでMAX_VALUEを最大とする
											var maxHeight = Number.MAX_VALUE;

											if (row._isVisibleRangeFinite()) {
												//拡大縮小を行っている場合、例えば拡大時だと
												//見かけの表示サイズ（表示量）は小さくなっているのでビューの最大サイズは大きくなる
												maxHeight = row.getVisibleHeightOfDisplay();
											}

											actualHeight = Math.min(row._desiredHeight, maxHeight);
										}

										if (actualHeight < 0) {
											actualHeight = 0;
										} else if (totalY + actualHeight > that._height) {
											actualHeight = 0;
										}

										row.getViewAll().forEach(function(v) {
											v.y = totalY;
											v._setHeight(actualHeight);
											//高さが変更されたので、ビューポートのサイズが
											//VisibleRangeより大きくなる可能性があるので
											//現在と同じ位置にスクロールを実行してVisibleRange制約を満たす位置にスクロールさせる。
											//(VisibleRangeの制約を満たしていれば今まで通りの位置のままのはず）
											v.scrollTo(v.viewport.displayX, v.viewport.displayY);
										});

										row._desiredHeight = actualHeight;

										if (row._scrollBarMode !== SCROLL_BAR_MODE_NONE
												&& row._isVisibleRangeFinite()) {
											row._showScrollBar();

											//スクロールバーの物理的な位置とサイズを調整。
											//論理的な位置・サイズは、この処理の中では
											//showScrollBar()の中で初期化される。
											row._setScrollBarHeight(actualHeight);
											row._setScrollBarTop(totalY);
										} else {
											row._hideScrollBar();
										}

										totalY += actualHeight;
									});
						},

						/**
						 * @private
						 */
						_updateGridRegionColumn: function() {
							this._preadjust(false);

							var totalX = 0;

							var that = this;

							this
									.getColumnsOfAllTypes()
									.forEach(
											function(column) {
												if (column.type === GRID_TYPE_SEPARATOR) {
													var sepLeft = totalX;
													//セパレータがビューの範囲を超えないようにする
													if (totalX > that._width - column._desiredWidth) {
														sepLeft = that._width
																- column._desiredWidth;
														if (sepLeft < 0) {
															//ただしビューの幅がセパレータの高さよりも小さい場合はビューの上端＝セパレータの上端とする
															sepLeft = 0;
														}
													}

													var $separator = $(column.getElement());
													$separator.css('left', sepLeft);
													totalX += column._desiredWidth;
													return;
												}

												var actualWidth = 0;
												if (column.overallIndex + 1 === that.numberOfOverallColumns) {
													//最後の行は、制約を無視して残りの高さを設定する
													actualWidth = that._width - totalX;

													if (that._willVScrollBarShow()) {
														//水平スクロールバーが下端に出る場合には、その分一番下の行のビューの高さを減らしておく
														actualWidth -= SCROLL_BAR_THICKNESS;
													}
												} else {
													//実際のビューの幅は「無限」はあり得ないのでMAX_VALUEを最大とする
													var maxWidth = Number.MAX_VALUE;

													if (column._isVisibleRangeFinite()) {
														maxWidth = column
																.getVisibleWidthOfDisplay();
													}

													actualWidth = Math.min(column._desiredWidth,
															maxWidth);
												}

												if (actualWidth < 0) {
													actualWidth = 0;
												} else if (totalX + actualWidth > that._width) {
													actualWidth = 0;
												}

												column.getViewAll().forEach(
														function(v) {
															v.x = totalX;
															v._setWidth(actualWidth);

															//幅が変更されたので、ビューポートのサイズが
															//VisibleRangeより大きくなる可能性がある。
															//現在と同じ位置にスクロールを実行してVisibleRange制約を満たす位置にスクロールさせる。
															//(VisibleRangeの制約を満たしていれば今まで通りの位置のままのはず）
															v.scrollTo(v.viewport.displayX,
																	v.viewport.displayY);
														});

												column._desiredWidth = actualWidth;

												if (column._scrollBarMode !== SCROLL_BAR_MODE_NONE
														&& column._isVisibleRangeFinite()) {
													column._showScrollBar();

													//スクロールバーの位置とサイズを調整
													column._setScrollBarWidth(actualWidth);
													column._setScrollBarLeft(totalX);
												} else {
													column._hideScrollBar();
												}

												totalX += actualWidth;
											});
						},

						/**
						 * 指定されたソースビューと同じ行・列のビューのスクロール位置をソースビューの位置と合わせます。
						 * 同じ行の場合はscrollYを、同じ列の場合はscrollXを合わせます。
						 *
						 * @private
						 * @param srcView ソースビュー
						 * @param newScrollPos 合わせるスクロール位置
						 */
						_applyScrollPositionToOthers: function(srcView, newScrollPos,
								suppressScrollBarUpdate) {
							//rowがnullの場合＝ビューがない
							var row = this.getRow(srcView.rowIndex);
							if (row) {
								row.getViewAll().forEach(function(v) {
									if (v !== srcView) {
										//同じ行の他のビューについて、スクロールYの値のみ揃える
										var vScrPos = v.getScrollPosition();
										v.scrollTo(vScrPos.x, newScrollPos.y);
									}
								});

								//TODO CollectionからunifiedSightChangeイベントをあげて
								//stage側で処理する、か、Collectionでスクロールバーを処理する
								if (suppressScrollBarUpdate !== false
										&& !this._stage._isInScrollBarScroll) {
									row._updateScrollBarLogicalValues();
								}
							}

							var col = this.getColumn(srcView.columnIndex);
							if (col) {
								col.getViewAll().forEach(function(v) {
									if (v !== srcView) {
										//同じ行の他のビューについて、スクロールYの値のみ揃える
										var vScrPos = v.getScrollPosition();
										v.scrollTo(newScrollPos.x, vScrPos.y);
									}
								});

								if (suppressScrollBarUpdate !== false
										&& !this._stage._isInScrollBarScroll) {
									col._updateScrollBarLogicalValues();
								}
							}
						},

						/**
						 * @private
						 */
						_onSightChange: function(event) {
							if (this._isSightChangePropagationSuppressed) {
								//あるビューのsightChangeに伴って他のビューを変更している最中の場合、
								//それによる連鎖的なsightChangeには反応しないようにする

								if (!this._sightChangeEvents) {
									this._sightChangeEvents = [];
								}
								this._sightChangeEvents.push(event);
								return;
							}

							var srcView = event.target;
							var newScrollPos = event.scrollPosition.newValue;

							this._isSightChangePropagationSuppressed = true;

							this._sightChangeEvents = [event];

							if (!event.scale.isChanged) {
								//スケールが変わっていない場合は
								//同じ行or列のビューのスクロール位置だけを合わせる
								this._applyScrollPositionToOthers(srcView, newScrollPos);
							} else {
								//スケールが変わった場合

								var newScaleX = event.scale.newValue.x;
								var newScaleY = event.scale.newValue.y;

								this.getViewAll().forEach(function(v) {
									if (v === srcView) {
										//自分自身は再度変更しない
										return;
									}

									var scaleCenterX = null;
									var scaleCenterY = null;

									var viewPagePos = v.getPagePosition();

									if (v.columnIndex < srcView.columnIndex) {
										//自分より左の列だったら、scaleCenterXはそのビューの右端
										scaleCenterX = viewPagePos.x + v.width;
									} else if (v.columnIndex > srcView.columnIndex) {
										//変更が起きたビューより右の列だったら、scaleCenterXはそのビューの左端
										scaleCenterX = viewPagePos.x;
									}

									if (v.rowIndex < srcView.rowIndex) {
										//自分より上の行だったら、scaleCenterYはそのビューの下端
										scaleCenterY = viewPagePos.y + v.height;
									} else if (v.rowIndex > srcView.rowIndex) {
										//変更が起きたビューよりと同じ行だったら、scollYは自分と同じにする
										scaleCenterY = viewPagePos.y;
									}

									//scaleCenterはPage座標で渡す必要がある
									v.setScale(newScaleX, newScaleY, scaleCenterX, scaleCenterY);
								});

								//スケールが変わった場合、VisibleRangeが設定されていると
								//現在のサイズがVisibleRangeの大きさより大きい状態になってしまう場合がある。
								//そのため、グリッドの領域を再度調整する。
								this._updateGridRegion();

								//同じ行・列についてスクロール位置を合わせる。
								//ただし、スクロールバーの位置はこの後全体で合わせるので
								//ここでは行わない（第3引数＝false）
								this._applyScrollPositionToOthers(srcView, newScrollPos, false);

								//スケールが変わった場合は全てのスクロールバーの論理サイズとポジションが変わる
								//（可能性がある）ので調整する
								this._updateAllScrollBars();
							}

							this._isSightChangePropagationSuppressed = false;

							if (!this._isTriggerUnifiedSightChangeSuppressed) {
								//makeGrid()によりグリッド構造が再生成される途中で
								//グリッド内の各ビューのサイズ変更などがおきるが、
								//そのときにはイベントを発生させないようにしている。

								//最後に、変更が起きたすべてのビューの変更をまとめて一つのイベントとして出す
								var unifiedSightChangeEvArg = {
									changes: []
								};
								this._sightChangeEvents.forEach(function(ev) {
									var e = {
										view: ev.target,
										scrollPosition: ev.scrollPosition,
										scale: ev.scale
									};
									unifiedSightChangeEvArg.changes.push(e);
								});

								//このイベントは、全てのビューのsightChangeが完了した後に一度だけ発生させる
								this._stage.trigger(EVENT_VIEW_UNIFIED_SIGHT_CHANGE,
										unifiedSightChangeEvArg);
							}

							this._sightChangeEvents = null;
						},

						/**
						 * sightChange時、スケールが変更されていた場合に全てのスクロールバーのスクロールサイズを更新します。
						 *
						 * @private
						 */
						_updateAllScrollBars: function() {
							var rows = this.getRows();
							for (var i = 0, rowLen = rows.length; i < rowLen; i++) {
								var row = rows[i];
								row._updateScrollBarLogicalValues();
							}

							var columns = this.getColumns();
							for (var i = 0, colLen = columns.length; i < colLen; i++) {
								var column = columns[i];
								column._updateScrollBarLogicalValues();
							}
						},

						/**
						 * @private
						 */
						__onSelectDUStart: function(dragStartPos) {
							this.getViewAll().forEach(function(v) {
								v.__onSelectDUStart(dragStartPos);
							});
						},

						/**
						 * @private
						 */
						__onSelectDUMove: function(worldPos, worldWidth, worldHeight) {
							this.getViewAll().forEach(function(v) {
								v.__onSelectDUMove(worldPos, worldWidth, worldHeight);
							});
						},

						/**
						 * @private
						 */
						__onSelectDUEnd: function() {
							this.getViewAll().forEach(function(v) {
								v.__onSelectDUEnd();
							});
						},

						/**
						 * @private
						 */
						__onDragDUStart: function(dragSession) {
							var targetDUs = dragSession.getTarget();
							if (!Array.isArray(targetDUs)) {
								targetDUs = [targetDUs];
							}

							targetDUs.forEach(function(du) {
								//強制的に元のDUを非表示にする
								du._isForceHidden = true;
							});

							//各ビューのドラッグスタート処理を呼ぶ
							this.getViewAll().forEach(function(v) {
								v.__onDragDUStart(dragSession);
							});
						},

						/**
						 * @private
						 */
						__onDragDUMove: function(dragSession) {
							this.getViewAll().forEach(function(v) {
								v.__onDragDUMove(dragSession);
							});
						},

						/**
						 * @private
						 */
						__onDragDUDrop: function(dragSession) {
							var targetDUs = dragSession.getTarget();
							if (!Array.isArray(targetDUs)) {
								targetDUs = [targetDUs];
							}

							targetDUs.forEach(function(du) {
								//レイヤーに元々属するDUを強制的に非表示にしていたのを解除
								du._isForceHidden = false;
							});

							this.getViewAll().forEach(function(v) {
								v.__onDragDUDrop(dragSession);
							});
						}
					}
				};
				return desc;
			});

	/**
	 * 選択可能な(isSelectableがtrueな)全てのBasicDUを返す
	 *
	 * @param {DisplayUnit} root 探索のルートとなるDisplayUnit
	 * @returns BasicDisplayUnitの配列
	 */
	function getAllSelectableDisplayUnits(root) {
		var ret = [];

		if (typeof root._children !== 'undefined') {
			//rootが_childrenを持つ＝Containerの場合はroot自身は戻り値に含めない
			var children = root._children;
			for (var i = 0, len = children.length; i < len; i++) {
				var child = children[i];
				var descendants = getAllSelectableDisplayUnits(child);
				var filtered = descendants.filter(function(du) {
					return BasicDisplayUnit.isClassOf(du) && du.isSelectable;
				});
				Array.prototype.push.apply(ret, filtered);
			}
		} else {
			ret.push(root);
		}
		return ret;
	}

	/**
	 * コンテナを含む、全てのDUを返す
	 *
	 * @private
	 * @param {DisplayUnit} root 探索のルートとなるDisplayUnit
	 * @returns 全てのDisplayUnitを含む配列
	 */
	function getAllDisplayUnits(root) {
		var ret = [];

		if (typeof root._children !== 'undefined') {
			//rootが_childrenを持つ＝Containerの場合はroot自身は戻り値に含めない
			var children = root._children;
			for (var i = 0, len = children.length; i < len; i++) {
				var child = children[i];
				var descendants = getAllDisplayUnits(child);
				Array.prototype.push.apply(ret, descendants);
			}
		} else {
			ret.push(root);
		}
		return ret;
	}

	var DRAG_MODE_NONE = DragMode.NONE;
	var DRAG_MODE_AUTO = DragMode.AUTO;
	var DRAG_MODE_SCREEN = DragMode.SCREEN;
	var DRAG_MODE_DU = DragMode.DU;
	var DRAG_MODE_SELECT = DragMode.SELECT;
	var DRAG_MODE_REGION = DragMode.REGION;

	var SCROLL_DIRECTION_NONE = ScrollDirection.NONE;
	var SCROLL_DIRECTION_X = ScrollDirection.X;
	var SCROLL_DIRECTION_Y = ScrollDirection.Y;
	var SCROLL_DIRECTION_XY = ScrollDirection.XY;

	var BOUNDARY_SCROLL_INTERVAL = 20;
	var BOUNDARY_SCROLL_INCREMENT = 10;

	var EVENT_SIGHT_CHANGE = 'stageSightChange';

	var EVENT_VIEW_UNIFIED_SIGHT_CHANGE = 'stageViewUnifiedSightChange';

	var EVENT_DU_CASCADE_REMOVING = 'duCascadeRemoving';

	var EVENT_DU_CLICK = 'duClick';
	var EVENT_DU_DBLCLICK = 'duDblclick';

	var EVENT_DU_SELECT = 'duSelect';

	var EVENT_DU_MOUSE_LEAVE = 'duMouseLeave';
	var EVENT_DU_MOUSE_ENTER = 'duMouseEnter';

	var EVENT_DU_KEY_DOWN = 'duKeyDown';
	var EVENT_DU_KEY_PRESS = 'duKeyPress';
	var EVENT_DU_KEY_UP = 'duKeyUp';

	var EVENT_DRAG_SELECT_START = 'stageDragSelectStart';
	var EVENT_DRAG_SELECT_END = 'stageDragSelectEnd';

	var EVENT_DRAG_REGION_START = 'stageDragRegionStart';
	var EVENT_DRAG_REGION_END = 'stageDragRegionEnd';

	var EVENT_VIEW_STRUCTURE_CHANGE = 'stageViewStructureChange';
	var EVENT_VIEW_REGION_CHANGE = 'stageViewRegionChange';

	/**
	 * ドラッグ開始直前に発生するイベント。デフォルト挙動：ドラッグの開始
	 */
	var EVENT_STAGE_DRAG_STARTING = 'stageDragStarting';

	var EVENT_DRAG_DU_START = 'stageDragStart';
	var EVENT_DRAG_DU_MOVE = 'stageDragMove';
	var EVENT_DRAG_DU_END = 'stageDragEnd';
	var EVENT_DRAG_DU_DROP = 'stageDragDrop';
	var EVENT_DRAG_DU_CANCEL = 'stageDragCancel';

	var EVENT_STAGE_CLICK = 'stageClick';

	var EVENT_STAGE_CONTEXTMENU = 'stageContextmenu';
	var EVENT_DU_CONTEXTMENU = 'duContextmenu'; // { displayUnit: }

	var ABSOLUTE_SCALE_MIN = 0.01;

	var SELECTION_CHANGE = 'stageSelectionChange';

	var PROXY_DEFAULT_CURSOR_OFFSET = 3;

	var StageUtil = h5.ui.components.stage.StageUtil;

	var SCROLL_BAR_ARROW_DIFF = 100;

	/* ダブルクリックとみなす最大の待ち時間 */
	var DBLCLICK_WAIT = 280; // ms

	var stageController = {
		/**
		 * @memberOf h5.ui.components.stage.StageController
		 */
		__name: 'h5.ui.components.stage.StageController',

		/**
		 * @private
		 */
		_layers: null,

		/**
		 * @private
		 */
		_units: null,

		/**
		 * @private
		 */
		_viewport: null,

		/**
		 * @private
		 */
		_initData: null,

		/**
		 * @private
		 */
		_defs: null,

		/**
		 * @private
		 */
		_scaleRangeX: null,

		/**
		 * @private
		 */
		_scaleRangeY: null,

		UIDragScreenScrollDirection: SCROLL_DIRECTION_XY,

		isWheelScrollDirectionReversed: false,

		isWheelScaleDirectionReversed: false,

		//(UI操作によるかどうかは関係なく)スクロールする範囲を配列で指定。
		//{ min: , max: } をディスプレイ座標で指定。

		//TODO dependsOn()
		/**
		 * @private
		 */
		_selectionLogic: h5.ui.SelectionLogic,

		/**
		 * @private
		 */
		_focusController: h5.ui.components.stage.FocusController,

		initView: function() {
			this._viewCollection.initView();
			//一度initViewした後は、初期のDU投入は完了していると考える。
			//グリッドの分割時に新しく生成したビューは
			//自動的に初期化されるようにするため、ここでisAutoInitViewを強制的にtrueにする。
			this._viewCollection._isAutoInitView = true;
		},

		select: function(displayUnit, isExclusive) {
			if (!Array.isArray(displayUnit)) {
				displayUnit = [displayUnit];
			}

			//選択可能なDUのみにする
			var actualSelection = displayUnit.filter(function(du) {
				return du.isSelectable;
			});

			this._selectionLogic.select(actualSelection, isExclusive);
		},

		selectAll: function() {
			var basicUnits = this._getAllSelectableDisplayUnits();
			this._selectionLogic.select(basicUnits);
		},

		/**
		 * @private
		 */
		_getAllSelectableDisplayUnits: function() {
			var layers = this._layers;
			var ret = [];
			for (var i = 0, len = layers.length; i < len; i++) {
				var layer = layers[i];
				var units = getAllSelectableDisplayUnits(layer);
				Array.prototype.push.apply(ret, units);
			}
			return ret;
		},

		unselect: function(du) {
			this._selectionLogic.unselect(du);
		},

		unselectAll: function() {
			this._selectionLogic.unselectAll();
		},

		getDisplayUnitById: function(id) {
			var layers = this._layers;
			for (var i = 0, len = layers.length; i < len; i++) {
				var layer = layers[i];
				var du = layer.getDisplayUnitById(id);
				if (du) {
					return du;
				}
			}
			return null;
		},

		getDisplayUnitUnderPointer: function() {
			return this._lastEnteredDU;
		},

		getDisplayUnitsInRect: function(displayX, displayY, displayWidth, displayHeight,
				isSelectableOnly) {
			var wtl = this._getActiveView()._viewport.getWorldPosition(displayX, displayY);
			var ww = this._getActiveView()._viewport.toWorldX(displayWidth);
			var wh = this._getActiveView()._viewport.toWorldY(displayHeight);

			//ワールド座標系のRectに直す
			var wRect = Rect.create(wtl.x, wtl.y, ww, wh);

			if (isSelectableOnly === undefined) {
				//isSelectableOnlyはデフォルト：true
				isSelectableOnly = true;
			}

			//指定されたRectに完全に含まれるDUを全て返す
			var ret = [];
			var allDU = isSelectableOnly ? this._getAllSelectableDisplayUnits() : this
					.getDisplayUnitsAll();
			for (var i = 0, len = allDU.length; i < len; i++) {
				var du = allDU[i];
				var worldGlobalPos = du.getWorldGlobalPosition();
				var duGlobalRect = Rect.create(worldGlobalPos.x, worldGlobalPos.y, du.width,
						du.height);
				if (wRect.contains(duGlobalRect)) {
					ret.push(du);
				}
			}
			return ret;
		},

		getSelectedDisplayUnits: function() {
			var selected = this._selectionLogic.getSelected();
			return selected;
		},

		isSelected: function(displayUnit) {
			var isSelected = this._selectionLogic.isSelected(displayUnit);
			return isSelected;
		},

		focus: function(displayUnit) {
			if (displayUnit.isSelectable) {
				return this._selectionLogic.focus(displayUnit);
			}
		},

		unfocus: function(andUnselect) {
			return this._selectionLogic.unfocus(andUnselect);
		},

		getFocusedDisplayUnit: function() {
			var focused = this._selectionLogic.getFocused();
			return focused;
		},

		isFocused: function(displayUnit) {
			var isFocused = this._selectionLogic.isFocused(displayUnit);
			return isFocused;
		},

		/**
		 * 引数で指定された全てのタグを含むDisplayUnitを返します。
		 *
		 * @param tags タグ文字列またはタグ文字列の配列
		 * @returns {Array}
		 */
		getDisplayUnitsByGroupTag: function(tags) {
			var ret = [];

			//Array.isArray()はES5＝IE9以上で実装されているので利用可能
			if (!Array.isArray(tags)) {
				tags = [tags];
			}

			var allUnits = this.getDisplayUnitsAll();
			for (var i = 0, len = allUnits.length; i < len; i++) {
				var hasAllTags = true;
				var unit = allUnits[i];

				//tagsで指定された全てのタグを含んでいたら
				//そのDUを戻り値に含める
				var groupTag = unit.groupTag;
				for (var j = 0, jLen = tags.length; j < jLen; j++) {
					if (!groupTag.has(tags[j])) {
						hasAllTags = false;
						break;
					}
				}

				if (hasAllTags) {
					ret.push(unit);
				}
			}

			return ret;
		},

		getDisplayUnitsAll: function() {
			var ret = [];
			var layers = this._layers;
			for (var i = 0, len = layers.length; i < len; i++) {
				var units = getAllDisplayUnits(layers[i]);
				Array.prototype.push.apply(ret, units);
			}
			return ret;
		},

		/**
		 * @private
		 */
		__construct: function() {
			this._units = new Map();
			this._layers = [];
			this.UIDragMode = DRAG_MODE_AUTO;

			this._isDblclickEmulationEnabled = true;

			this._scaleRangeX = {
				min: null,
				max: null
			};

			this._scaleRangeY = {
				min: null,
				max: null
			};

			var that = this;
			this._dragMoveWrapper = function() {
				that._doDragMove();
			},

			this._duCascadeRemovingListener = function(event) {
				that._onDUCascadeRemoving(event);
			};

			this._viewCollection = GridStageViewCollection.create(this);
		},

		/**
		 * @private
		 */
		__ready: function() {
			//overflow: hiddenは各StageView側で設定
			$(this.rootElement).css({
				position: 'absolute'
			});
		},

		'{this._selectionLogic} selectionChange': function(context) {
			var ev = context.event;
			var focusedDU = ev.focused;

			var isFocusDirtyNotified = false;

			//今回新たに選択されたDUの選択フラグをONにする
			var selected = ev.changes.selected;
			for (var i = 0, len = selected.length; i < len; i++) {
				var newSelectedDU = selected[i];
				newSelectedDU._isSelected = true;

				var reasons = [UpdateReasons.SELECTION_CHANGE];
				if (newSelectedDU === focusedDU) {
					//あるDUが選択され同時にフォーカスも得た場合には
					//Dirtyの通知回数を減らすためreasonに追加
					reasons.push(UpdateReasons.FOCUS_CHANGE);

					//先に状態を変更してからsetDirty()する
					focusedDU._isFocused = true;

					//TODO フォーカス変更後、再描画が発生するのでここでfocusedElementを設定してもダメ
					//this._focusController.setFocusedElement(focusedDU._domRoot);

					isFocusDirtyNotified = true;
				}
				newSelectedDU._setDirty(reasons);
			}

			var unfocusedDU = ev.changes.unfocused;
			var isUnfocusDirtyNotified = false;

			//今回非選択状態になったDUの選択フラグをOFFにする
			var unselected = ev.changes.unselected;
			for (var i = 0, len = unselected.length; i < len; i++) {
				var unselectedDU = unselected[i];
				unselectedDU._isSelected = false;

				var reasons = [UpdateReasons.SELECTION_CHANGE];
				if (unselectedDU === unfocusedDU) {
					//newSelectedと同様、Dirtyの回数を最適化
					reasons.push(UpdateReasons.FOCUS_CHANGE);

					//先に状態を変更してからsetDirty()する
					unfocusedDU._isFocused = false;

					isUnfocusDirtyNotified = true;
				}
				unselectedDU._setDirty(reasons);
			}

			if (focusedDU && !isFocusDirtyNotified) {
				//すでに選択状態で、今回はフォーカスが当たっただけ
				//selectionChangeの方でfocusChangeも通知済みなら
				//こちらではsetDirtyしない（Dirty回数の最適化）
				focusedDU._isFocused = true;
				//this._focusController.setFocusedElement(focusedDU._domRoot);
				focusedDU._setDirty(UpdateReasons.FOCUS_CHANGE);
			}

			if (unfocusedDU && !isUnfocusDirtyNotified) {
				unfocusedDU._isFocused = false;
				unfocusedDU._setDirty(UpdateReasons.FOCUS_CHANGE);
			}

			var evArg = {
				selected: ev.selected,
				focused: ev.focused,
				changes: {
					selected: ev.changes.selected,
					unselected: ev.changes.unselected,
					unfocused: ev.changes.unfocused
				}
			};

			this.trigger(SELECTION_CHANGE, evArg);
		},

		/**
		 * targetで指定された要素を含むBasicDUを返す。 BasicDUに含まれていない場合はnullを返す。
		 *
		 * @private
		 * @param target
		 */
		_getIncludingDisplayUnit: function(target) {
			function getIncludingDUInner(elem) {
				if (elem === root) {
					return null;
				}
				var duId = elem.getAttribute('data-h5-dyn-du-id');
				var du = this.getDisplayUnitById(duId);
				if (BasicDisplayUnit.isClassOf(du) || Edge.isClassOf(du)) {
					return du;
				}
				return getIncludingDUInner.call(this, elem.parentNode);
			}

			var root = this.rootElement;

			if (!target
					|| target === root
					|| !(root.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
				return null;
			}

			var ret = getIncludingDUInner.call(this, target);
			return ret;
		},

		/**
		 * @private
		 */
		_isDblclickEmulationEnabled: null,

		/**
		 * @private
		 */
		_dblclickWaitTimer: null,

		/**
		 * @private
		 */
		_processClick: function(event, triggerEventName) {
			if (this._isDraggingStarted) {
				//ドラッグ操作が終わった直後のclickイベントの場合は何もしない
				//mouseupよりもclickイベントが後に発生するので、このタイミングでフラグをオフにする
				this._isDraggingStarted = false;
				return;
			}

			var du = this._getIncludingDisplayUnit(event.target);

			var isExclusive = !event.shiftKey;
			if (!du) {
				//ステージがクリックまたはダブルクリックされた場合

				if (event.type !== 'click') {
					//ダブルクリックの場合は何もしない
					return;
				}

				var stageClickEventArg = {
					stageController: this
				};
				//TODO duClickとstageClickは背反なのでここでのイベントクローンはコード共通化できる
				var stageClickEvent = $.event.fix(event.originalEvent);
				stageClickEvent.type = EVENT_STAGE_CLICK;
				stageClickEvent.target = this.rootElement;
				stageClickEvent.currentTarget = this.rootElement;
				$(this.rootElement).trigger(stageClickEvent, stageClickEventArg);

				//ステージがクリックされた場合はDUからのイベントは発生しない
				if (isExclusive && !stageClickEvent.isDefaultPrevented()) {
					//ステージがクリックされ、かつ排他選択だった(shiftKeyが押されていなかった)時、かつ
					//ステージクリックのデフォルト挙動がキャンセルされなかった場合は全て選択解除
					this._selectionLogic.unselectAll();
				}
				return;
			}

			//以下はDUがクリックまたはダブルクリックされた場合

			//下のduClickイベントのハンドラ内で再描画が発生する可能性があるので、
			//イベント発火前にどのビューの要素がクリックされたか、
			//およびクリックされたDUのルート要素をキャッシュしておく

			//TODO rAFで実際の再描画を遅延させると
			//イベントのタイミングではrequestRender()が呼ばれるだけなので
			//要素は消えなくなるはず

			var view = this._getActiveViewFromElement(event.target);

			//duClickイベントは、DUがselectableかどうかに関係なく発生させる
			var evArg = {
				stageController: this,
				displayUnit: du
			};
			var duClickEvent = $.event.fix(event.originalEvent);
			duClickEvent.type = triggerEventName;
			duClickEvent.target = event.target;
			duClickEvent.currentTarget = event.target;

			$(event.target).trigger(duClickEvent, evArg);

			if (this._isDblclickEmulationEnabled) {
				if (this._dblclickWaitTimer) {
					//指定時間内に2回目のクリックがあった＝ダブルクリックとみなす
					clearTimeout(this._dblclickWaitTimer);
					this._dblclickWaitTimer = null;

					if (view) {
						var duRootElement = view.getElementForDisplayUnit(du);

						if (duRootElement) {
							var duDblclickEvent = $.event.fix(event.originalEvent);
							duDblclickEvent.type = EVENT_DU_DBLCLICK;
							duDblclickEvent.target = duRootElement;
							duDblclickEvent.currentTarget = duRootElement;

							var evArg = {
								stageController: this,
								displayUnit: du
							};

							$(duRootElement).trigger(duDblclickEvent, evArg);
						}
					}
				} else {
					var that = this;

					//最初のクリック＝タイマーをセットする
					this._dblclickWaitTimer = setTimeout(function() {
						//タイムアウトした＝指定時間内に2度目のクリックがなかったので
						//一度タイマーID（フラグ）を解除する
						that._dblclickWaitTimer = null;
					}, DBLCLICK_WAIT);
				}
			}

			if (!du.isSelectable || duClickEvent.isDefaultPrevented()) {
				//DUがselectableでない場合は選択処理はしない。
				//また、イベントのデフォルト処理がキャンセルされた場合も
				//clickイベントの場合の選択処理は行わない
				//これは、直前のduClickのイベントハンドラの中でユーザーが他のDUを選択した場合に
				//この後の処理によって選択状態が強制的に変更されてしまうことを防ぐ
				//（ユーザーが任意に選択状態を設定できる余地を残す）ためである。
				return;
			}

			du.select(isExclusive);
			du.focus();

			//dblclickはclickに続いて発生するので、二重に選択イベントを出すことになるので
			//clickイベントのときだけイベントを発生させる
			if (event.type === 'click') {
				this.trigger(EVENT_DU_SELECT, {
					stageController: this,
					displayUnit: du
				});
			}
		},

		UIDragMode: DRAG_MODE_AUTO,

		/**
		 * @private
		 */
		_currentDragMode: DRAG_MODE_NONE,

		/**
		 * @private
		 */
		_dragSelectStartPos: null,

		/**
		 * @private
		 */
		_dragSelectStartSelectedDU: null,

		/**
		 * @private
		 */
		_dragStartPagePos: null,

		/**
		 * @private
		 */
		_dragLastPagePos: null,

		/**
		 * @private
		 */
		_dragSession: null,

		/**
		 * @private
		 */
		_dragStartRootOffset: null, //ドラッグ中のみ使用する、rootElementのoffset()値

		/**
		 * @private
		 */
		_startDrag: function(context) {
			// 前回のドラッグが（非同期処理の待ちのために）終了していない場合、新規に開始しない
			if (this._dragSession) {
				return;
			}
			var event = context.event;
			var du = this._getIncludingDisplayUnit(event.target); //BasicDUを返す

			this._currentDragMode = DRAG_MODE_NONE;

			var dragStartMode = this.UIDragMode;

			var stageDragStartingEvent = $.Event(EVENT_STAGE_DRAG_STARTING);
			stageDragStartingEvent.setDragMode = function(dragMode) {
				dragStartMode = dragMode;
			};
			this.trigger(stageDragStartingEvent, {
				displayUnit: du,
				stageController: this
			});

			if (stageDragStartingEvent.isDefaultPrevented()) {
				//ドラッグ開始全体をキャンセル
				return;
			}

			//TODO shiftKeyやctrlKeyが押されていた場合…など、特殊な場合の選択挙動を調整
			if (du && du.isSelectable) {
				//FIXME du.isSelectedのフラグ値がおかしいので要修正
				if (!this.isSelected(du)) {
					//選択されていない場合は、単独選択する
					du.select(true);
				}
				//フォーカスは必ずあてる
				du.focus();
			}

			this._dragLastPagePos = {
				x: event.pageX,
				y: event.pageY
			};

			var $root = $(this.rootElement);

			this._dragStartRootOffset = $root.offset(); //offset()は毎回取得すると重いのでドラッグ中はキャッシュ

			switch (dragStartMode) {
			case DRAG_MODE_NONE:
				//UI操作によるドラッグを行わないモードの場合は、何もしない
				break;
			case DRAG_MODE_DU:
				//DUドラッグモード、かつ実際にDUをつかんでいたら、DUドラッグを開始
				//DUを掴んでいなかった場合は、何もしない
				if (du && du.isDraggable) {
					this._dragSession = DragSession.create(this, this.rootElement,
							this._foremostLayer._rootG, context.event);
					this._dragSession.addEventListener('dragSessionEnd', this
							.own(this._dragSessionEndHandler));
					this._dragSession.addEventListener('dragSessionCancel', this
							.own(this._dragSessionCancelHandler));
					this._dragSession.setTarget(targetDU);
					this._currentDragMode = DRAG_MODE_DU;
					setCursor('default');
					this.trigger(EVENT_DRAG_DU_START, {
						dragSession: this._dragSession
					});

					//TODO 処理をAUTOの場合と統一
					if (dragSession.getProxy()) {
						//TODO プロキシを出す
					}
				}
				break;
			case DRAG_MODE_SCREEN:
				if (this.UIDragScreenScrollDirection !== SCROLL_DIRECTION_NONE) {
					//SCREENドラッグモード固定、かつ、
					//UI操作によるスクロールがX,Yどちらかの方向に移動可能な場合はスクリーンドラッグを開始
					this._currentDragMode = DRAG_MODE_SCREEN;
					setCursor('move');
				}
				break;
			case DRAG_MODE_SELECT:
				//SELECTモード固定なら、SELECTドラッグを開始
				//TODO コード共通化
				this._currentDragMode = DRAG_MODE_SELECT;
				saveDragSelectStartPos.call(this);
				this._dragSelectStartSelectedDU = this.getSelectedDisplayUnits();
				this.trigger(EVENT_DRAG_SELECT_START, {
					stageController: this
				});
				setCursor('default');

				this._dragSelectOverlayRect = SvgUtil.createElement('rect');
				this._dragSelectOverlayRect.className.baseVal = ('stageDragSelectRangeOverlay');
				SvgUtil.setAttributes(this._dragSelectOverlayRect, {
					x: this._dragSelectStartPos.x,
					y: this._dragSelectStartPos.y,
					width: 0,
					height: 0,
					'pointer-events': 'none'
				});
				this._foremostLayer._rootG.appendChild(this._dragSelectOverlayRect);
				break;
			case DRAG_MODE_REGION:
				this.trigger(EVENT_DRAG_REGION_START, {
					stageController: this
				});

				setCursor('default');
				this._currentDragMode = DRAG_MODE_REGION;
				saveDragSelectStartPos.call(this);

				this._dragSelectOverlayRect = SvgUtil.createElement('rect');
				this._dragSelectOverlayRect.className.baseVal = ('stageDragRegionOverlay');
				SvgUtil.setAttributes(this._dragSelectOverlayRect, {
					x: this._dragSelectStartPos.x,
					y: this._dragSelectStartPos.y,
					width: 0,
					height: 0,
					'pointer-events': 'none'
				});
				this._foremostLayer._rootG.appendChild(this._dragSelectOverlayRect);

				break;
			case DRAG_MODE_AUTO:
			default:
				//UIDragModeがAUTOの場合
				if (du && du.isDraggable) {
					//DUを掴んでいて、かつそれがドラッグ可能な場合はDUドラッグを開始
					this._dragSession = DragSession.create(this, this.rootElement, context.event);

					var that = this;
					this._dragSessionEndHandlerWrapper = function(ev) {
						that._dragSessionEndHandler(ev);
					};
					this._dragSessionCancelHandlerWrapper = function(ev) {
						that._dragSessionCancelHandler(ev);
					};

					this._dragSession.addEventListener('dragSessionEnd',
							this._dragSessionEndHandlerWrapper);
					this._dragSession.addEventListener('dragSessionCancel',
							this._dragSessionCancelHandlerWrapper);

					//デフォルトでは、選択中のDUがドラッグ対象となる。ただしisDraggable=falseのものは除く。
					var targetDU = this.getSelectedDisplayUnits();
					targetDU = targetDU.filter(function(dragTargetDU) {
						return dragTargetDU.isDraggable;
					});
					this._dragSession.setTarget(targetDU);

					//TODO fix()だとoriginalEventのoffset補正が効かないかも。h5track*の作り方を参考にした方がよい？？
					var delegatedJQueryEvent = $.event.fix(context.event.originalEvent);

					delegatedJQueryEvent.type = EVENT_DRAG_DU_START;
					delegatedJQueryEvent.target = this.rootElement;
					delegatedJQueryEvent.currentTarget = this.rootElement;
					//$.event.fix()を使用すると、isDefaultPrevented()はoriginalEventの
					//defaultPreventedの値を引き継いで返してしまう。
					//しかし、originalEventのdefaultPreventedの値はユーザーは書き換えられず、
					//またjQueryが追加するisDefaultPrevented()は内部フラグ値を
					//クロージャで持っているため外から変更できない。
					//そのため、preventDefaultとisDefaultPreventedを両方書き換えて
					//「preventDefaultされていない状態」でイベントを発火させられるようにする。
					var isDelegatedJQueryEventDefaultPrevented = false;
					delegatedJQueryEvent.preventDefault = function() {
						isDelegatedJQueryEventDefaultPrevented = true;
					};
					delegatedJQueryEvent.isDefaultPrevented = function() {
						return isDelegatedJQueryEventDefaultPrevented;
					};

					//イベントをあげ終わったタイミングで、ドラッグ対象が決定する
					var dragStartEvent = this.trigger(delegatedJQueryEvent, {
						dragSession: this._dragSession
					});

					if (dragStartEvent.isDefaultPrevented()) {
						//TODO:stageDragStartイベントでpreventDefault()された場合の挙動
						return;
					}

					this._currentDragMode = DRAG_MODE_DU;
					setCursor('default');

					this._dragSession.begin();

					this._viewCollection.__onDragDUStart(this._dragSession);

					//プロキシが設定されたらそれを表示
					var proxyElem = this._dragSession.getProxyElement();
					var proxyLeft = event.pageX - this._dragStartRootOffset.left;
					var proxyTop = event.pageY - this._dragStartRootOffset.top;
					if (proxyElem) {
						$root.append(proxyElem);
						$(proxyElem).css({
							position: 'absolute',
							left: proxyLeft + PROXY_DEFAULT_CURSOR_OFFSET,
							top: proxyTop + PROXY_DEFAULT_CURSOR_OFFSET
						});
					}
				} else {
					//DUを掴んでいない場合またはDU.isDraggable=falseの場合、
					//・Shiftキーを押している場合はSELECTドラッグ
					//・押していなくてかつスクロール方向がNONE以外ならSCREENドラッグ　を開始
					if (event.shiftKey) {
						var dragSelectStartEvent = this.trigger(EVENT_DRAG_SELECT_START, {
							stageController: this
						});

						if (dragSelectStartEvent.isDefaultPrevented()) {
							return;
						}

						setCursor('default');
						this._currentDragMode = DRAG_MODE_SELECT;
						saveDragSelectStartPos.call(this);
						this._dragSelectStartSelectedDU = this.getSelectedDisplayUnits();

						this._viewCollection.__onSelectDUStart(this._dragSelectStartPos);
					} else if (this.UIDragScreenScrollDirection !== SCROLL_DIRECTION_NONE) {
						//TODO スクリーンドラッグの場合もstageDragScrollStartイベントをだしpreventDefault()できるようにする

						this._currentDragMode = DRAG_MODE_SCREEN;
						setCursor('move');
					}
				}
				break;
			}

			function saveDragSelectStartPos() {
				//TODO rootOffsetの取得をDUドラッグの場合と共通化
				var rootOffset = $(this.rootElement).offset();

				var activeView = this._getActiveView();

				var dispStartOffX = event.pageX - rootOffset.left - activeView.x;
				var dispStartOffY = event.pageY - rootOffset.top - activeView.y;
				this._dragSelectStartPos = activeView._viewport
						.getDisplayPositionFromDisplayOffset(dispStartOffX, dispStartOffY);
			}

			//注：Chrome51では、cursorの値を変えても、
			//ドラッグが終了するまでカーソルが変わらない。
			//IE11, FFでは、cursorを書き換えた瞬間に(ドラッグ途中でも)変更される。
			function setCursor(value) {
				$root.css('cursor', value);
			}
		},

		/**
		 * @private
		 */
		_isMousedown: false,

		/**
		 * @private
		 */
		_isScrollBarEvent: function(eventTarget) {
			var $scrollbar = $(eventTarget).closest('.h5-stage-scrollbar');

			var dom = $scrollbar[0];

			if (dom && this.rootElement.compareDocumentPosition(dom)
					& Node.DOCUMENT_POSITION_CONTAINED_BY) {
				return true;
			}
			return false;
		},

		/**
		 * @private
		 */
		_isInScrollBarScroll: false,

		'{rootElement} h5scroll': function(context, $el) {
			var $scrollbar = $(context.event.target).closest('.h5-stage-scrollbar');

			var dom = $scrollbar[0];
			if (!dom
					|| !(this.rootElement.compareDocumentPosition(dom) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
				return;
			}

			var idx = $scrollbar.data('h5DynStageIdx');
			var isVertical = $scrollbar.hasClass('vertical');

			this._isInScrollBarScroll = true;

			if (isVertical) {
				var row = this._viewCollection.getRow(idx);

				var newPos = 0;
				var isIndexScroll = context.evArg.vertical.type === 'indexDiff';
				if (isIndexScroll) {
					//diffは正方向なら1、逆方向なら-1
					newPos = row._scrollBarController.getScrollPosition() + SCROLL_BAR_ARROW_DIFF
							* context.evArg.vertical.diff;

					var vScrollSize = row._scrollBarController.getScrollSize();

					if (newPos < 0) {
						newPos = 0;
					} else if (newPos > vScrollSize) {
						newPos = vScrollSize;
					}

					row._scrollBarController.setScrollPosition(newPos);
				} else {
					//このpositionはワールド座標系の値
					newPos = context.evArg.vertical.position;
				}

				//ここではnewPosはワールド座標
				var scrY = row._getViewportYFromScrollBarPosition(newPos);
				var scrDispY = row.getView(0)._viewport.toDisplayY(scrY);
				//setScrollYに渡す座標はディスプレイ座標
				row.setScrollY(scrDispY);
			} else {
				var col = this._viewCollection.getColumn(idx);

				var newPos = 0;
				var isIndexScroll = context.evArg.horizontal.type === 'indexDiff';
				if (isIndexScroll) {
					newPos = col._scrollBarController.getScrollPosition() + SCROLL_BAR_ARROW_DIFF
							* context.evArg.horizontal.diff;

					var hScrollSize = col._scrollBarController.getScrollSize();

					if (newPos < 0) {
						newPos = 0;
					} else if (newPos > hScrollSize) {
						newPos = hScrollSize;
					}

					col._scrollBarController.setScrollPosition(newPos);
				} else {
					newPos = context.evArg.horizontal.position;
				}

				//ここではnewPosはワールド座標
				var scrX = col._getViewportXFromScrollBarPosition(newPos);
				var scrDispX = col.getView(0)._viewport.toDisplayX(scrX);
				col.setScrollX(scrDispX);
			}

			this._isInScrollBarScroll = false;
		},

		'{rootElement} mousedown': function(context, $el) {
			if (this._isScrollBarEvent(context.event.target)) {
				//スクロールバー操作については直接関知しない
				return;
			}

			var event = context.event;

			this._isMousedown = true;
			this._isDraggingStarted = false;

			this._dragStartPagePos = {
				x: event.pageX,
				y: event.pageY
			};

			this._dragLastPagePos = {
				x: event.pageX,
				y: event.pageY
			};

			var view = this._getActiveViewFromElement(event.target);
			if (view) {
				this._viewCollection.setActiveView(view);
			}

			if ($(event.target).hasClass('stageGridSeparator')) {
				//ドラッグ対象がグリッドセパレータの場合は
				//グリッドのサイズ変更とみなす
				this._startGridSeparatorDrag(context);
			}

			//DUのドラッグの場合、IE、Firefoxではmousedownの場合textなどでドラッグすると
			//文字列選択になってしまうのでキャンセルする
			context.event.preventDefault();

			//TODO 初回のmousemoveのタイミングで
			//動作対象を決めると、DUの端の方にカーソルがあったときに
			//mousedown時にはDUの上にカーソルがあったのに
			//moveのときに離れてしまい、スクリーンドラッグと判定されるなど
			//挙動が一貫しない可能性がある。
			//そのため、ドラッグモードについては
			//mousedownのタイミングで決定しつつ、
			//実際にdragStartとみなす（イベントを発生させる）のは
			//moveのタイミングにするのがよい。
		},

		/**
		 * @private
		 */
		_throttledLastDragMoveContext: null,

		/**
		 * @private
		 */
		_processDragMove: function(context) {
			if (!this._isMousedown) {
				//mousedownしていない＝ドラッグ操作でない場合
				return;
			}

			context.event.preventDefault();

			if (this._isGridSeparatorDragging) {
				this._processGridSeparatorDragMove(context);
				return;
			}

			if (!this._isDraggingStarted) {
				this._startDrag(context);
				this._isDraggingStarted = true;
				return;
			}

			//このフラグは、clickイベントハンドラ(_processClick())の中で
			//「ドラッグ操作直後のclickイベントかどうか」（＝そのclickイベントは無視すべきかどうか）を
			//判断するためのフラグである。
			//ただし、h5trackendは一度もマウスが動かなかった場合でも発火するため、
			//trackendのタイミングでtrueにしてしまうと、常にフラグがtrueになってしまう。
			//そのため、一度以上実際にmoveが起きたこのタイミングでフラグをtrueにすることで
			//実際ドラッグが行われた場合のみフラグがONになる。
			this._isDraggingStarted = true;

			if (this._currentDragMode === DRAG_MODE_NONE) {
				return;
			}

			this._throttledLastDragMoveContext = context;

			if (this._rafId) {
				return;
			}

			this._rafId = requestAnimationFrame(this._dragMoveWrapper);
		},

		/**
		 * @private
		 */
		_dragMoveWrapper: null,

		/**
		 * @private
		 */
		_doDragMove: function() {
			this._rafId = null;

			var context = this._throttledLastDragMoveContext;

			this._throttledLastDragMoveContext = null;

			var event = context.event;

			var dispDx = event.pageX - this._dragLastPagePos.x;
			var dispDy = event.pageY - this._dragLastPagePos.y;

			this._dragLastPagePos = {
				x: event.pageX,
				y: event.pageY
			};

			if (dispDx === 0 && dispDy === 0) {
				//X,Yどちらの方向にも実質的に動きがない場合は何もしない
				return;
			}

			//TODO fix()だとoriginalEventのoffset補正が効かないかも。h5track*の作り方を参考にした方がよい？？
			var delegatedJQueryEvent = $.event.fix(context.event.originalEvent);

			var that = this;

			switch (this._currentDragMode) {
			case DRAG_MODE_DU:
				this.toggleBoundaryScroll(function(dispScrX, dispScrY) {
					that._dragSession.doPseudoMoveBy(dispScrX, dispScrY);
				});

				//doMoveの中でStageViewCollection.__onDragDUMoveが呼ばれる
				this._dragSession.doMove(context.event);

				//プロキシが設定されたらそれを表示
				//TODO プロキシの移動はDragSessionに任せる方向で。constructorでドラッグのルート(Stage)を渡せば可能のはず
				var proxyElem = this._dragSession.getProxyElement();
				if (proxyElem) {
					var proxyLeft = event.pageX - this._dragStartRootOffset.left;
					var proxyTop = event.pageY - this._dragStartRootOffset.top;

					$(proxyElem).css({
						position: 'absolute',
						left: proxyLeft + PROXY_DEFAULT_CURSOR_OFFSET,
						top: proxyTop + PROXY_DEFAULT_CURSOR_OFFSET
					});
				}

				var dragOverDU = this._getDragOverDisplayUnit(context.event);

				delegatedJQueryEvent.type = EVENT_DRAG_DU_MOVE;
				delegatedJQueryEvent.target = this.rootElement;
				delegatedJQueryEvent.currentTarget = this.rootElement;

				this.trigger(delegatedJQueryEvent, {
					dragSession: this._dragSession,
					dragOverDisplayUnit: dragOverDU
				});

				break;
			case DRAG_MODE_REGION:
				this.toggleBoundaryScroll(function() {
					var dragPos = that._getCurrentDragPosition();

					//ドラッグ範囲を示す半透明のオーバーレイのサイズを更新
					that._updateDragOverlay(dragPos.dispActualX, dragPos.dispActualY,
							dragPos.dispW, dragPos.dispH);
				});

				var dragPos = this._getCurrentDragPosition();

				//ドラッグ範囲を示す半透明のオーバーレイのサイズを更新
				this._updateDragOverlay(dragPos.dispActualX, dragPos.dispActualY, dragPos.dispW,
						dragPos.dispH);
				break;
			case DRAG_MODE_SELECT:
				this.toggleBoundaryScroll(function() {
					var dragSelectedDU = that.dragSelect();
					var tempSelection = that._dragSelectStartSelectedDU.concat(dragSelectedDU);
					that.select(tempSelection, true);
				});

				var dragSelectedDU = this.dragSelect();
				var tempSelection = this._dragSelectStartSelectedDU.concat(dragSelectedDU);
				this.select(tempSelection, true);
				break;
			case DRAG_MODE_SCREEN:
				switch (this.UIDragScreenScrollDirection) {
				case SCROLL_DIRECTION_X:
					dispDy = 0;
					break;
				case SCROLL_DIRECTION_Y:
					dispDx = 0;
					break;
				case SCROLL_DIRECTION_XY:
					break;
				case SCROLL_DIRECTION_NONE:
				default:
					dispDx = 0;
					dispDy = 0;
					break;
				}

				if (dispDx !== 0 || dispDy !== 0) {
					//X,Yどちらかの方向に移動量がある場合はスクロール処理を行う
					//ただしScrollRangeが指定されている場合は実際にはスクロールしない可能性はある
					this.scrollBy(-dispDx, -dispDy);
				}
				break;
			default:
				break;
			}
		},

		dragSelect: function() {
			var pos = this._getCurrentDragPosition();

			//ドラッグ範囲を示す半透明のオーバーレイのサイズを更新
			this._updateDragOverlay(pos.dispActualX, pos.dispActualY, pos.dispW, pos.dispH);

			//TODO isSelectableがfalseなものを除く
			return this.getDisplayUnitsInRect(pos.dispActualX, pos.dispActualY, pos.dispW,
					pos.dispH, true);
		},

		toggleBoundaryScroll: function(callback) {
			var activeView = this._getActiveView();

			var pointerX = this._dragLastPagePos.x - this._dragStartRootOffset.left - activeView.x;
			var pointerY = this._dragLastPagePos.y - this._dragStartRootOffset.top - activeView.y;

			var nineSlice = activeView._viewport.getNineSlicePosition(pointerX, pointerY);
			if (nineSlice.x !== 0 || nineSlice.y !== 0) {
				this._beginBoundaryScroll(nineSlice, callback);
			} else {
				this._endBoundaryScroll();
			}
		},

		/**
		 * @private
		 */
		_updateDragOverlay: function(dispActualX, dispActualY, dispW, dispH) {
			var activeView = this._getActiveView();

			var worldPos = activeView._viewport.getWorldPosition(dispActualX, dispActualY);
			var ww = activeView._viewport.toWorldX(dispW);
			var wh = activeView._viewport.toWorldY(dispH);

			this._viewCollection.__onSelectDUMove(worldPos, ww, wh);
		},

		/**
		 * @private
		 */
		_getCurrentDragPosition: function() {
			var rootOffset = $(this.rootElement).offset();

			var activeView = this._getActiveView();

			var dispLastOffX = this._dragLastPagePos.x - rootOffset.left - activeView.x;
			var dispLastOffY = this._dragLastPagePos.y - rootOffset.top - activeView.y;

			var dispStartPos = this._dragSelectStartPos;
			var dispLastPos = this._getActiveView()._viewport.getDisplayPositionFromDisplayOffset(
					dispLastOffX, dispLastOffY);

			var dispW = dispLastPos.x - dispStartPos.x;
			var dispActualX;
			if (dispW < 0) {
				dispActualX = dispLastPos.x;
				dispW *= -1;
			} else {
				dispActualX = dispStartPos.x;
			}

			var dispH = dispLastPos.y - dispStartPos.y;
			var dispActualY;
			if (dispH < 0) {
				dispActualY = dispLastPos.y;
				dispH *= -1;
			} else {
				dispActualY = dispStartPos.y;
			}

			return {
				dispActualX: dispActualX,
				dispActualY: dispActualY,
				dispW: dispW,
				dispH: dispH
			};
		},

		'{document} mouseup': function(context) {

			if (this._rafId) {
				cancelAnimationFrame(this._rafId);
				this._rafId = null;
			}

			this._endBoundaryScroll();

			if (this._isGridSeparatorDragging) {
				//グリッドセパレータのドラッグの場合
				this._endGridSeparatorDrag(context);
			}

			//this._currentDragMode === DRAG_MODE_NONEの場合は何もしない

			if (this._currentDragMode === DRAG_MODE_SELECT) {
				this._viewCollection.__onSelectDUEnd();

				this.trigger(EVENT_DRAG_SELECT_END, {
					stageController: this
				});
			} else if (this._currentDragMode === DRAG_MODE_REGION) {
				var lastDragPos = this._getCurrentDragPosition();

				var worldPos = this._getActiveView()._viewport.getWorldPosition(
						lastDragPos.dispActualX, lastDragPos.dispActualY);
				var ww = this._getActiveView()._viewport.toWorldX(lastDragPos.dispW);
				var wh = this._getActiveView()._viewport.toWorldY(lastDragPos.dispH);

				var dispRect = Rect.create(lastDragPos.dispActualX, lastDragPos.dispActualY,
						lastDragPos.dispW, lastDragPos.dispH);
				var worldRect = Rect.create(worldPos.x, worldPos.y, ww, wh);

				this.trigger(EVENT_DRAG_REGION_END, {
					stageController: this,
					displayRect: dispRect,
					worldRect: worldRect
				});
			} else if (this._currentDragMode === DRAG_MODE_DU) {
				var dragOverDU = this._getDragOverDisplayUnit(context.event);

				var delegatedJQueryEvent = $.event.fix(context.event.originalEvent);
				delegatedJQueryEvent.type = EVENT_DRAG_DU_DROP;
				delegatedJQueryEvent.target = this.rootElement;
				delegatedJQueryEvent.currentTarget = this.rootElement;

				this._viewCollection.__onDragDUDrop(this._dragSession);

				this.trigger(delegatedJQueryEvent, {
					dragSession: this._dragSession,
					dragOverDisplayUnit: dragOverDU
				});

				// 同期なら直ちにendまたはcancelに遷移
				// dragSessionのイベント経由で最終的にdisposeが走る
				// 非同期の場合はdisposeしない
				if (this._dragSession && !this._dragSession.isCompleted && !this._dragSession.async) {
					if (!this._dragSession.canDrop) {
						this._dragSession.cancel();
					} else {
						this._dragSession.end();
					}
				}
			}

			this._cleanUpDragStates();
		},

		/**
		 * 同期、非同期に関わらず、マウスを離した瞬間にすべきクリーンアップ処理。DragSessionは非同期の場合があるのでここでは削除処理を行わない。
		 *
		 * @private
		 */
		_cleanUpDragStates: function() {
			this._isMousedown = false;
			this._dragStartRootOffset = null;
			this._currentDragMode = DRAG_MODE_NONE;
			this._dragSelectStartPos = null;
			this._dragSelectStartSelectedDU = null;
			this._dragStartPagePos = null;
			this._dragLastPagePos = null;
			$(this.rootElement).css('cursor', 'auto');
		},

		/**
		 * @private
		 */
		_disposeDragSession: function() {
			this._dragSession.removeEventListener('dragSessionEnd',
					this._dragSessionEndHandlerWrapper);
			this._dragSession.removeEventListener('dragSessionCancel',
					this._dragSessionCancelHandlerWrapper);
			this._dragSession = null; //TODO dragSessionをdisposeする
		},

		/**
		 * @private
		 */
		_getDragOverDisplayUnit: function(event) {
			//ドラッグ中、ドラッグ対象のDUはpointer-events=noneの
			//隠し最前面レイヤーに移動している。
			//そのため、イベントはその他のレイヤーにあるDUから発生する。
			//つまり、event.targetを含むDUは、ドラッグオーバーしているDUになる。
			var dragOverDU = this._getIncludingDisplayUnit(event.target);
			return dragOverDU;
		},

		/**
		 * @private
		 */
		_isDraggingStarted: false,

		/**
		 * @private
		 */
		_boundaryScrollTimerId: null,

		/**
		 * @private
		 */
		_nineSlice: null,

		/**
		 * @private
		 */
		_beginBoundaryScroll: function(nineSlice, callback) {
			//途中で方向が変わった場合のため、9-Sliceだけは常に更新する
			this._nineSlice = nineSlice;

			if (this._boundaryScrollTimerId) {
				return;
			}

			var that = this;
			this._boundaryScrollTimerId = setInterval(function() {
				//ディスプレイ座標系での移動量
				var boundaryScrX = BOUNDARY_SCROLL_INCREMENT * that._nineSlice.x;
				var boundaryScrY = BOUNDARY_SCROLL_INCREMENT * that._nineSlice.y;

				var actualDiff = that._scrollBy(boundaryScrX, boundaryScrY);
				callback(actualDiff.dx, actualDiff.dy);
			}, BOUNDARY_SCROLL_INTERVAL);
		},

		/**
		 * @private
		 */
		_endBoundaryScroll: function() {
			if (this._boundaryScrollTimerId) {
				clearInterval(this._boundaryScrollTimerId);
				this._boundaryScrollTimerId = null;
				this._nineSlice = null;
			}
		},

		setup: function(initData) {
			//TODO setup()が__readyより前などいつ呼ばれても正しく動作するようにする

			//現在保持しているすべてのビューを破棄する
			this._viewCollection._clear(true);

			this._clearLayers();

			this._initData = initData;

			if (initData.layers) {
				for (var i = 0, len = initData.layers.length; i < len; i++) {
					var layerDef = initData.layers[i];
					var layer = Layer.create(layerDef.id, this);
					this.addLayer(layer, null, layerDef.isDefault);
				}
			}

			if (initData.view && initData.view.autoInit === false) {
				this._viewCollection._isAutoInitView = false;
			} else {
				this._viewCollection._isAutoInitView = true;
			}

			//初期状態では分割のない表示を行う
			this._resetGridView(null, null);
		},

		addDisplayUnit: function(displayUnit) {
			this._units.set(displayUnit.id, displayUnit);
			this._defaultLayer.addDisplayUnit(displayUnit);
		},

		removeDisplayUnit: function(displayUnit) {
			this.removeDisplayUnitById(displayUnit.id);
		},

		removeDisplayUnitById: function(id) {
			this._unit["delete"](id);

			var duToBeRemoved = this.getDisplayUnitById(id);
			duToBeRemoved.remove();
		},

		removeDisplayUnitAll: function() {
		//TODO
		},

		/**
		 * @private
		 */
		_defaultLayer: null,

		/**
		 * @private
		 */
		_duCascadeRemovingListener: null,

		/**
		 * @private
		 */
		_onDUCascadeRemoving: function(event) {
			var evArg = {
				targetDisplayUnit: event.targetDisplayUnit,
				relatedDisplayUnit: event.relatedDisplayUnit
			};
			var ev = this.trigger(EVENT_DU_CASCADE_REMOVING, evArg);
			if (ev.isDefaultPrevented()) {
				//カスケード削除がキャンセルされたことを通知
				event.preventDefault();
			}
		},

		addLayer: function(layer, index, isDefault) {
			if (!layer) {
				throw new Error('レイヤーインスタンスがnullです。');
			}

			if (this._layers.length === 0 || isDefault === true) {
				this._defaultLayer = layer;
			}

			layer.addEventListener('displayUnitCascadeRemoving', this._duCascadeRemovingListener);

			if (index != null) {
				this._layers.splice(index, 0, layer);
			} else {
				this._layers.push(layer);
			}
			layer._onAddedToStage(this);
		},

		/**
		 * @private
		 */
		_removeLayer: function(layer) {
			var idx = this._layers.indexOf(layer);

			if (idx === -1) {
				return;
			}

			//TODO レイヤーを外したときにStageViewのリスナーを削除する

			this._layers.splice(idx, 1);
			layer
					.removeEventListener('displayUnitCascadeRemoving',
							this._duCascadeRemovingListener);
			layer._onRemovedFromStage();
		},

		/**
		 * @private
		 */
		_clearLayers: function() {
			var layers = this._layers.slice(0);
			var that = this;
			layers.forEach(function(layer) {
				that._removeLayer(layer);
			});
		},

		getLayer: function(id) {
			for (var i = 0, len = this._layers.length; i < len; i++) {
				var layer = this._layers[i];
				if (layer.id === id) {
					return layer;
				}
			}
			return null;
		},

		scrollTo: function(dispX, dispY) {
			return this._getActiveView().scrollTo(dispX, dispY);
		},

		scrollBy: function(displayDx, displayDy) {
			return this._getActiveView().scrollBy(displayDx, displayDy);
		},

		//TODO StageView側に移動、ただしDragSession内部で使っている
		/**
		 * @private
		 */
		_scrollBy: function(displayDx, displayDy) {
			return this._getActiveView()._scrollBy(displayDx, displayDy);
		},

		scrollWorldTo: function(worldX, worldY) {
			return this._getActiveView().scrollWorldTo(worldX, worldY);
		},

		scrollWorldBy: function(worldDx, worldDy) {
			return this._getActiveView().scrollWorldBy(worldDx, worldDy);
		},

		/**
		 * このステージの拡大率を設定します。スケール値はワールド座標系に対して設定されます。<br>
		 * つまり、scaleを2にすると、画面上は各オブジェクトが2倍の大きさの大きさで表示されます。<br>
		 * このメソッドを呼び出すことは、すべてのレイヤーのsetScale()に同じ値を設定することと等価です。<br>
		 * ただし、DisplayUnit.setScale()と異なり、拡縮時の中心位置を指定することができます。
		 *
		 * @param scaleX X軸方向の拡大率。nullの場合は現在のまま変更しない。
		 * @param scaleY Y軸方向の拡大率。nullの場合は現在のまま変更しない。
		 * @param displayPageX 拡縮時の中心点のx（ディスプレイ座標系におけるpageX(ドキュメントを基準とした座標。マウスイベント等に含まれるpageXと同じ)）
		 * @param displayPageY 拡縮時の中心点のy（仕様はxと同じ）
		 */
		setScale: function(scaleX, scaleY, displayPageX, displayPageY) {
			return this._getActiveView().setScale(scaleX, scaleY, displayPageX, displayPageY);
		},

		/**
		 * @private
		 */
		_getActiveView: function() {
			return this._viewCollection.getActiveView();
		},

		/**
		 * @private
		 */
		_getActiveViewFromElement: function(element) {
			var views = this._viewCollection.getViewAll();
			for (var i = 0, len = views.length; i < len; i++) {
				var view = views[i];
				if (view.isElementOwner(element)) {
					return view;
				}
			}
			return null;
		},

		setScaleRangeX: function(min, max) {
			this._getActiveView().setScaleRangeX(min, max);
		},

		setScaleRangeY: function(min, max) {
			this._getActiveView().setScaleRangeY(min, max);
		},

		getScrollPosition: function() {
			return this._getActiveView().getScrollPosition();
		},

		/**
		 * @private
		 */
		_lastEnteredDU: null,

		/**
		 * @private
		 */
		_dragSessionEndHandlerWrapper: null,

		/**
		 * @private
		 */
		_dragSessionEndHandler: function() {
			this.trigger(EVENT_DRAG_DU_END);
			this._disposeDragSession();
		},

		/**
		 * @private
		 */
		_dragSessionCancelHandlerWrapper: null,

		/**
		 * @private
		 */
		_dragSessionCancelHandler: function() {
			this.trigger(EVENT_DRAG_DU_CANCEL);
			this._disposeDragSession();
		},

		'.h5-stage-view-root click': function(context) {
			this._processClick(context.event, EVENT_DU_CLICK);
		},

		'.h5-stage-view-root dblclick': function(context) {
			if (this._isDblclickEmulationEnabled) {
				//ダブルクリックのエミュレーションが有効な場合は
				//ネイティブのdblclickイベントは無視する
				//（二重にイベントが発生する、挙動が一貫しないなどの問題を避けるため）
				return;
			}
			this._processClick(context.event, EVENT_DU_DBLCLICK);
		},

		'.h5-stage-view-root contextmenu': function(context) {
			var du = this._getIncludingDisplayUnit(context.event.target);

			// TODO: Edgeの選択が実装されておらず例外が発生するため、一時的に別関数で処理することでこれを回避
			//			if (Edge.isClassOf(du)) {
			//				this._temporarilyProcessEdgeContextmenu(context, du);
			//				return;
			//			}

			var orgEvent = context.event.originalEvent;

			//new Event(orgEvent)では、offsetXなどがコピーされないので
			//$.event.fix()を使用する。ただしこのAPIはあまりきちんとしたI/Fになっていないので
			//将来的な内部仕様の変更のリスクがある。
			//ただし、全くUndocumentedなわけではなく、
			//jQueryのサイトでもEvent Extensionsとしてver.1.7以降使える仕組みとして説明されてはいる。
			//https://learn.jquery.com/events/event-extensions/
			var fixedEvent = $.event.fix(orgEvent);

			if (!du) {
				//スクリーンが右クリックされた
				fixedEvent.type = EVENT_STAGE_CONTEXTMENU;
				var scrEv = this.trigger(fixedEvent, {
					stageController: this
				});
				if (scrEv.isDefaultPrevented()) {
					context.event.preventDefault();
				}
				return;
			}

			if (du.isSelectable && !du.isSelected) {
				//非選択状態のDUで右クリック(コンテキストメニュー)されたら、
				//そのDUを単独選択＆フォーカス状態にしてイベントをあげる。
				//予め選択されているDUで右クリックされた場合はそのままにする。
				//(Windowsエクスプローラと同じ挙動)
				du.select(true);
				du.focus();
			}

			fixedEvent.type = EVENT_DU_CONTEXTMENU;

			var duEv = this.trigger(fixedEvent, {
				stageController: this,
				displayUnit: du
			});
			if (duEv.isDefaultPrevented()) {
				context.event.preventDefault();
			}
		},

		/**
		 * ドラッグ中に要素外にカーソルがはみ出した場合にもイベントを拾えるよう、documentに対してバインドする
		 *
		 * @param context
		 * @param $el
		 */
		'{document} mousemove': function(context) {
			if (this._isMousedown) {
				//ドラッグ中の場合はドラッグハンドラで処理する
				this._processDragMove(context);
				return;
			}

			if (!(this.rootElement.compareDocumentPosition(context.event.target) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
				//ドラッグ中でない場合に、ルート要素の外側にマウスがはみ出した場合は何もしない
				return;
			}

			var currentMouseOverDU = this._getIncludingDisplayUnit(context.event.target);

			if (currentMouseOverDU === this._lastEnteredDU) {
				return;
			}

			if (this._lastEnteredDU) {
				//いずれかのDUにマウスオーバーしていた場合、
				//マウスオーバーしているDUが変わったので、前のDUはMouseLeaveにする
				this.trigger(EVENT_DU_MOUSE_LEAVE, {
					displayUnit: this._lastEnteredDU
				});
			}

			this._lastEnteredDU = currentMouseOverDU;

			if (currentMouseOverDU) {
				//新しく別のDUにマウスオーバーした場合
				this.trigger(EVENT_DU_MOUSE_ENTER, {
					displayUnit: currentMouseOverDU
				});
			}
		},

		/**
		 * ホイールイベントハンドラ。 イベント発生時にマウスカーソルがあった位置のビューでホイール操作を行う。ただし、ホイールではアクティブビューは変更しない。
		 *
		 * @param context
		 * @param $el
		 */
		'{rootElement} wheel': function(context, $el) {
			var event = context.event;
			var wheelEvent = event.originalEvent;

			var view = this._getActiveViewFromElement(event.target);

			if (!view) {
				return;
			}

			//画面のスクロールをキャンセル
			event.preventDefault();

			//順方向(下にホイールを回した)なら1(スクロール時：下にスクロール、スケール時：縮小)
			var wheelDirection = 1;

			if (wheelEvent.wheelDelta > 0 || wheelEvent.deltaY < 0) {
				//wheelDeltaは非標準だが、Chrome(51で確認)ではwheelイベントにもwheelDeltaを含む。(IE11, FF47では含まれない。)
				//Chromeの場合、shiftKeyを押しながらホイールを回すと
				//X方向のスクロールとして扱われ、deltaYが0になりdeltaXが変化する。(IE11, FF47では、shiftを押してもdeltaYが変化する。)
				//ブラウザの挙動に合わせるのも一つの考え方だが、この部品では現状スクロールバーは出しておらず
				//(＝X方向にスクロールするということがUI的に想起されない)
				//他ブラウザとの動作の一貫性から考えてもY方向にスクロールさせるのがよいと考える。
				//そのため、wheelDeltaを先に調べ、これがある場合は
				//その正負に基づきつつ常にY方向のスクロールとして扱うこととする。
				//なお、wheelDeltaとdeltaYは正負の論理が逆なので注意。
				wheelDirection = -1;
			}

			if (event.shiftKey) {
				// シフトキーが押されていたら拡大縮小
				if (this.isWheelScaleDirectionReversed) {
					wheelDirection *= -1;
				}

				var ds = -0.1 * wheelDirection;

				view.setScale(view._viewport.scaleX + ds, view._viewport.scaleY + ds,
						wheelEvent.pageX, wheelEvent.pageY);
				return;
			}

			//ステージをスクロールする
			if (this.isWheelScrollDirectionReversed) {
				wheelDirection *= -1;
			}
			var dy = 40 * wheelDirection;

			view.scrollBy(0, dy);
		},

		'{document} keydown': function(context) {
			this._processKeyEvent(context.event, EVENT_DU_KEY_DOWN);
		},

		'{document} keypress': function(context) {
			this._processKeyEvent(context.event, EVENT_DU_KEY_PRESS);
		},

		'{document} keyup': function(context) {
			this._processKeyEvent(context.event, EVENT_DU_KEY_UP);
		},

		/**
		 * @private
		 */
		_processKeyEvent: function(event, eventName) {
			var eventTarget = event.target;

			if (this._isInputTag(eventTarget) || !this._focusController.hasFocus()
					|| this._focusController.getFocusedElement() === this.rootElement) {
				//inputタグ、またはStageがフォーカスを持っていない、または
				//フォーカスをDUが持っていない場合は何もしない
				return;
			}

			var du = this.getFocusedDisplayUnit();

			if (!du) {
				//DUにフォーカスが当たっていない場合は何もしない
				return;
			}

			var activeView = this._getActiveView();
			var duDOM = activeView.getElementForDisplayUnit(du);

			//duKey*イベントの発生元は、現在アクティブなビューのDUのルート要素またはその子孫要素とする
			//なお、再描画が適宜発生するため、
			//input要素が子孫の場合はその要素になるが、それ以外の場合は
			//DUのrootElementがそうなる場合が多い
			var eventSource = duDOM;

			var ev = $.event.fix(event.originalEvent);
			ev.type = eventName;
			ev.target = eventSource;
			ev.currentTarget = eventSource;

			$(eventSource).trigger(ev, {
				displayUnit: du
			});
		},

		/**
		 * @private
		 */
		_isInputTag: function(element) {
			var tag = element.tagName.toLowerCase();
			if (tag === 'input' || tag === 'textarea' || tag === 'select') {
				return true;
			}
			return false;
		},

		setVisibleRangeX: function(worldLeftX, worldRightX) {
			return this._getActiveView().setVisibleRangeX(worldLeftX, worldRightX);
		},

		setVisibleRangeY: function(worldTopY, worldBottomY) {
			return this._getActiveView().setVisibleRangeY(worldTopY, worldBottomY);
		},

		/**
		 * @private
		 */
		_viewCollection: null,

		getViewCollection: function() {
			return this._viewCollection;
		},

		splitView: function(horizontalSplitDefinitions, verticalSplitDefinitions) {
			this._resetGridView(horizontalSplitDefinitions, verticalSplitDefinitions);

			var evArg = this._createViewStructureChangeEventArg();
			this.trigger(EVENT_VIEW_STRUCTURE_CHANGE, evArg);
		},

		/**
		 * @private
		 */
		_resetGridView: function(horizontalSplitDefinitions, verticalSplitDefinitions) {
			var w = $(this.rootElement).width();
			var h = $(this.rootElement).height();

			this._viewCollection._makeGrid(horizontalSplitDefinitions, verticalSplitDefinitions, w,
					h);
		},

		/**
		 * @private
		 */
		_createViewStructureChangeEventArg: function() {
			//TODO 変更前の値のオブジェクトを作る
			return {};
		},

		/**
		 * @private
		 */
		_isGridSeparatorDragging: false,

		/**
		 * @private
		 */
		_gridSeparatorDragContext: null,

		/**
		 * @private
		 */
		_startGridSeparatorDrag: function(context) {
			var $el = $(context.event.target);

			var index = parseInt($el.data('stageDynSepIdx'));
			var isHorizontal = $el.hasClass('horizontal');

			var sep;
			var prevLine, nextLine;
			var prevSize, nextSize;

			//TODO StageViewCollection側にseparatorをIndex指定で取得するAPIを作るべき
			if (isHorizontal) {
				var allRows = this._viewCollection.getRowsOfAllTypes();
				sep = allRows[index];
				prevLine = allRows[index - 1];
				prevSize = prevLine.height;
				nextLine = allRows[index + 1];
				nextSize = nextLine.height;
			} else {
				var allCols = this._viewCollection.getColumnsOfAllTypes();
				sep = allCols[index];
				prevLine = allCols[index - 1];
				prevSize = prevLine.width;
				nextLine = allCols[index + 1];
				nextSize = nextLine.width;
			}

			//セパレータドラッグ中は、ドラッグで見える可能性がある範囲を一度だけ描画し、ドラッグ完了まで可視範囲判定を抑制する
			//TODO ドラッグ対象のセパレータのindexに応じて描画範囲をより最適化する
			//TODO ドラッグ中にもDUが追加されたりrequestRender()が呼ばれる可能性もあるのでそれらは描画する（今は全てのアップデートを止めている）
			//MEMO: visibleの制御をおこなわないこととしたので、下記のコードは不要。
			//			this._viewCollection.getViewAll().forEach(
			//					this.own(function(view) {
			//						var vpwRect = view._viewport.getWorldRect();
			//
			//						var worldW = view.coordinateConverter
			//								.toWorldXLength(this._viewCollection._width);
			//						var worldH = view.coordinateConverter
			//								.toWorldYLength(this._viewCollection._height);
			//
			//						//セパレータ操作中に可視範囲に入り得る最大は
			//						//「現在のスクロール位置を中心に、上下左右に"現在のViewCollection全体の幅/高さ"分だけ広げた領域」となる。
			//						//VisibleRangeが設定されている場合や現在のスクロール位置によっては
			//						//多少無駄な領域が発生する可能性はあるが、それほど大きなペナルティではないと考える。
			//						var renderX = vpwRect.x - (worldW - vpwRect.width);
			//						var renderY = vpwRect.y - (worldH - vpwRect.height);
			//						//「幅」でRectを指定するので、ずらしたX座標の分追加で足す必要がある
			//						var renderW = vpwRect.x + vpwRect.width + worldW * 2;
			//						var renderH = vpwRect.y + vpwRect.height + worldH * 2;
			//
			//						var renderRect = Rect.create(renderX, renderY, renderW, renderH);
			//
			//						view.update(null, renderRect);
			//						view._isUpdateSuppressed = true;
			//					}));

			this._gridSeparatorDragContext = {
				separatorElement: context.event.target,
				isHorizontal: isHorizontal,
				separatorLine: sep,
				prevLine: prevLine,
				prevSize: prevSize,
				nextLine: nextLine,
				nextSize: nextSize,
				//trueだったら順方向にロック（"前"のビューのサイズがロックされている）、
				//falseだったら逆方向にロック（"後ろ"のビューのサイズがロックされている）
				lockedDirection: null,
				//セパレータ要素のpageオフセットのleftかtopが入っている
				separatorLockedPos: 0
			};
			this._isGridSeparatorDragging = true;
		},

		/**
		 * @private
		 */
		_processGridSeparatorDragMove: function(context) {
			var event = context.event;

			var dragContext = this._gridSeparatorDragContext;
			var isHorizontal = dragContext.isHorizontal;

			var cursorPageX = event.pageX;
			var cursorPageY = event.pageY;

			var dragLastPagePos = this._dragLastPagePos;

			this._dragLastPagePos = {
				x: cursorPageX,
				y: cursorPageY
			};

			//セパレータの前後どちらかのビューがVisibleRangeいっぱいを表示しているときは、
			//カーソルがセパレータの位置に来るまではリサイズを行わない
			if (dragContext.lockedDirection !== null) {
				if (isHorizontal) {
					//水平セパレータの場合
					if (dragContext.lockedDirection) {
						//セパレータの上のビューがロックされているので
						//カーソル位置がセパレータより下にある場合はロック継続
						if (cursorPageY > dragContext.separatorLockedPos
								+ dragContext.separatorLine.height) {
							return;
						}
					} else {
						//セパレータの下のビューがロックされている
						if (cursorPageY < dragContext.separatorLockedPos) {
							return;
						}
					}
				} else {
					//垂直セパレータの場合
					if (dragContext.lockedDirection) {
						//セパレータの左のビューがロックされているので
						//カーソル位置がセパレータより右にある場合はロック継続
						if (cursorPageX > dragContext.separatorLockedPos
								+ dragContext.separatorLine.width) {
							return;
						}
					} else {
						//セパレータの右のビューがロックされている
						if (cursorPageX < dragContext.separatorLockedPos) {
							return;
						}
					}
				}
			}

			var isForwardMove = true;
			var viewVisibleSize = 0;
			var viewportWorldSize = 0;
			var targetLine = null;

			if (isHorizontal) {
				//水平セパレータなので、下方向に動かしたらforward=true
				isForwardMove = dragLastPagePos.y - event.pageY < 0;

				if (isForwardMove) {
					//順方向＝下方向の移動なので、
					//VisibleRangeの制約チェック対象は"上"のビュー
					targetLine = dragContext.prevLine;
				} else {
					//"下"のビューが制約チェック対象
					targetLine = dragContext.nextLine;
				}

				viewportWorldSize = targetLine.getView(0).coordinateConverter
						.toWorldYLength(targetLine.height);
				viewVisibleSize = targetLine.getVisibleHeight();
			} else {
				//垂直セパレータなので、右方向に動かしたらfoward=true
				isForwardMove = dragLastPagePos.x - event.pageX < 0;

				if (isForwardMove) {
					//順方向＝右方向の移動なので、
					//VisibleRangeの制約チェック対象は"前のビュー"
					targetLine = dragContext.prevLine;
				} else {
					targetLine = dragContext.nextLine;
				}

				viewportWorldSize = targetLine.getView(0).coordinateConverter
						.toWorldXLength(targetLine.width);
				viewVisibleSize = targetLine.getVisibleWidth();
			}

			//セパレータの移動方向に対して"後ろ"のビューの表示サイズが
			//すでにVisibleRangeのサイズいっぱいだったらこれ以上動かさない
			if (viewportWorldSize >= viewVisibleSize) {
				var sepOffset = $(dragContext.separatorElement).offset();
				dragContext.separatorLockedPos = isHorizontal ? sepOffset.top : sepOffset.left;

				//lockedDirectionがtrueの場合は
				//セパレータの"前"のビューが制限に達したという意味になる。
				//従って、lockedDirectionをチェックするときは
				//カーソル位置がセパレータよりも"前"にあるかどうかをチェックし、
				//"前"にある場合はlock状態継続、そうでなければロック解除すればよい。
				dragContext.lockedDirection = isForwardMove;

				return;
			}

			dragContext.lockedDirection = null;

			var $root = $(this.rootElement);

			var rootOffset = $root.offset();
			var rootRight = rootOffset.left + $root.width() - dragContext.separatorLine.width;
			var rootBottom = rootOffset.top + $root.height() - dragContext.separatorLine.height;

			if (this._viewCollection._isHScrollBarShow()) {
				//下に水平スクロールバーが表示されている場合、
				//セパレータが動く最大の位置はStageのルートのbottomから
				//スクロールバーの高さを引いた位置になる
				rootBottom -= SCROLL_BAR_THICKNESS;
			}

			if (cursorPageY > rootBottom) {
				cursorPageY = rootBottom;
			} else if (cursorPageY < rootOffset.top) {
				cursorPageY = rootOffset.top;
			}

			if (this._viewCollection._isVScrollBarShow()) {
				rootRight -= SCROLL_BAR_THICKNESS;
			}

			if (cursorPageX > rootRight) {
				cursorPageX = rootRight;
			} else if (cursorPageX < rootOffset.left) {
				cursorPageX = rootOffset.left;
			}

			var dispDx = cursorPageX - this._dragStartPagePos.x;
			var dispDy = cursorPageY - this._dragStartPagePos.y;

			if (isHorizontal) {
				//水平分割(上下に分割)しているので、X方向には動かさない
				dispDx = 0;
			} else {
				//垂直分割（左右に分割）なのでY方向には動かさない
				dispDy = 0;
			}

			if (dispDx === 0 && dispDy === 0) {
				//実質的にX,Yどちらの方向にも動きがない場合は何もしない
				return;
			}

			if (isHorizontal) {
				//水平セパレータの場合
				var availableHeight = dragContext.prevSize + dragContext.separatorLine.height
						+ dragContext.nextSize;

				if (isForwardMove) {
					//下に動かしたので上のビューが制約優先ビュー
					var prevLineUnlimitedHeight = dragContext.prevSize + dispDy;
					this._limitViewSizeToVisibleSize(isHorizontal, dragContext.prevLine,
							dragContext.nextLine, dragContext.separatorLine,
							prevLineUnlimitedHeight, availableHeight);
				} else {
					//上に動かしたので下のビューが制約優先ビュー
					var nextLineUnlimitedHeight = dragContext.nextSize - dispDy;
					this._limitViewSizeToVisibleSize(isHorizontal, dragContext.nextLine,
							dragContext.prevLine, dragContext.separatorLine,
							nextLineUnlimitedHeight, availableHeight);
				}
			} else {
				//垂直セパレータの場合
				var availableWidth = dragContext.prevSize + dragContext.separatorLine.width
						+ dragContext.nextSize;

				if (isForwardMove) {
					//右に動かしたので左のビューが制約優先ビュー
					var prevLineUnlimitedWidth = dragContext.prevSize + dispDx;
					this._limitViewSizeToVisibleSize(isHorizontal, dragContext.prevLine,
							dragContext.nextLine, dragContext.separatorLine,
							prevLineUnlimitedWidth, availableWidth);
				} else {
					//左に動かしたので右のビューが制約優先ビュー
					var nextLineUnlimitedWidth = dragContext.nextSize - dispDx;
					this._limitViewSizeToVisibleSize(isHorizontal, dragContext.nextLine,
							dragContext.prevLine, dragContext.separatorLine,
							nextLineUnlimitedWidth, availableWidth);
				}
			}

			this._viewCollection._updateGridRegion();

			this._isDraggingStarted = true;

			var evArg = {
				isLive: true
			//				rowIndices: [0, 2],
			//				columnIndices: null,
			//
			//				rowSeparatorIndices: null,
			//				columnSeparatorIndices: null,
			};
			this.trigger(EVENT_VIEW_REGION_CHANGE, evArg);
		},

		/**
		 * @private
		 */
		_limitViewSizeToVisibleSize: function(isHorizontal, preferredLine, oppositeLine,
				separatorLine, desiredSize, availableSize) {
			var preferredLineMaxSize = Infinity;

			if (preferredLine._isVisibleRangeFinite()) {
				if (isHorizontal) {
					preferredLineMaxSize = preferredLine.getVisibleHeightOfDisplay();
				} else {
					preferredLineMaxSize = preferredLine.getVisibleWidthOfDisplay();
				}
			}

			//制約があればそれを最大に、そうでなければカーソル位置に基づく位置を
			//優先ビューの高さとする
			//非優先ビューの高さは先に決まった高さの残り
			var actualDesiredSize = Math.min(desiredSize, preferredLineMaxSize);

			if (isHorizontal) {
				preferredLine._desiredHeight = actualDesiredSize;
				oppositeLine._desiredHeight = availableSize - actualDesiredSize
						- separatorLine.height;
			} else {
				preferredLine._desiredWidth = actualDesiredSize;
				oppositeLine._desiredWidth = availableSize - actualDesiredSize
						- separatorLine.width;
			}
		},

		/**
		 * @private
		 */
		_endGridSeparatorDrag: function(context, $el) {
			this._isGridSeparatorDragging = false;
			this._gridSeparatorDragContext = null;

			var evArg = {
				isLive: false
			};
			this.trigger(EVENT_VIEW_REGION_CHANGE, evArg);
		}
	};


	h5.core.expose(stageController);

})(jQuery);
