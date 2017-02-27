/*
 * Copyright (C) 2012-2016 NS Solutions Corporation
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
	//TODO FocusControllerはh5.ui.focusManager()としてグローバルに実装する予定
	//一時的にこっちに置いている

	var DATA_FOCUS_GROUP = 'data-h5-focus-group';

	function FocusGroup(elem, groupName) {
		this.element = elem;
		this.name = groupName;
	}

	var isKeyboardEventCtorSupported = typeof KeyboardEvent === 'function';

	var focusController = {
		/**
		 * @memberOf h5.ui.FocusController
		 */
		__name: 'h5.ui.FocusController',

		_currentFocusGroupElement: null,

		_currentFocusGroupName: null,

		_lastClickElement: null,

		isKeyEventEmulationEnabled: true,

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

		_processKeyEvent: function(event) {
			if (!this.isKeyEventEmulationEnabled || event.originalEvent.isFocusEmulated === true
					|| event.isFocusEmulated === true) {
				//エミュレーションして出したイベントの場合は二重処理しない
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

			return;

			//IE11, Chrome51
			//Chrome, Safari(WebKit系ブラウザ)は、initKeyboardEvent()にバグがあり
			//keyやkeyCodeなどが正しくセットされず、実質使用できない。
			//また、IEにおいても、initKeyboardEvent()で設定されるのはkeyのみで、
			//keyCodeなど他の値は正しく設定されない。
			//しかも、char, which, keyCode等は読み取り専用になっており
			//後から設定することもできない(IE11)。

		},

		_updateFocus: function(element) {
			this._lastClickElement = element;

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
		}
	};

	h5.core.expose(focusController);

	//	h5.u.obj.expose('h5.ui', {
	//		focusManager: {
	//			init: function() {
	//				h5.core.controller('body', focusController);
	//			}
	//		}
	//	});

	//h5.core.expose(focusController);

})();

(function($) {
	'use strict';

	var RootClass = h5.cls.RootClass;

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

	var UpdateReasons = {
		RENDER_REQUEST: REASON_RENDER_REQUEST,
		SIZE_CHANGE: REASON_SIZE_CHANGE,
		POSITION_CHANGE: REASON_POSITION_CHANGE,
		VISIBILITY_CHANGE: REASON_VISIBILITY_CHANGE,
		SCALE_CHANGE: REASON_SCALE_CHANGE,
		Z_INDEX_CHANGE: REASON_Z_INDEX_CHANGE,
		INITIAL_RENDER: REASON_INITIAL_RENDER,
		SCROLL_POSITION_CHANGE: REASON_SCROLL_POSITION_CHANGE
	};

	h5.u.obj.expose('h5.ui.components.stage', {
		DragMode: DragMode,
		ScrollDirection: ScrollDirection,
		UpdateReasons: UpdateReasons
	});


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
		clamp: clamp
	});

	var EventDispatcher = h5.cls.manager.getClass('h5.event.EventDispatcher');
	var Event = h5.cls.manager.getClass('h5.event.Event');
	var PropertyChangeEvent = h5.cls.manager.getClass('h5.event.PropertyChangeEvent');

	/**
	 * DragSession
	 * <p>
	 * DisplayUnitのドラッグ操作を行うためのクラスです。
	 * </p>
	 *
	 * @class
	 * @name DragSession
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
					//TODO オブジェクト化してまとめて保持
					this._targetInitialPositions = positions;
					this._targetInitialParentDU = parentDUs;
				},

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

					this._stage._stageViewCollection.__onDragDUMove(this);
				},

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
						_x: null,
						_y: null
					},
					accessor: {
						x: {
							get: function() {
								return this._x;
							},
							set: function(value) {
								this._x = value;
							}
						},
						y: {
							get: function() {
								return this._y;
							},
							set: function(value) {
								this._y = value;
							}
						},
						width: null, //TODO 実験用にwidth,heightは _p_width のままにしている
						height: null
					},
					method: {
						/**
						 * @memberOf h5.ui.components.stage.Rect
						 */
						constructor: function Rect(x, y, width, height) {
							super_.constructor.call(this);
							this._x = x !== undefined ? x : 0;
							this._y = y !== undefined ? y : 0;
							this._p_width = width !== undefined ? width : 0;
							this._p_height = height !== undefined ? height : 0;
						},
						setRect: function(x, y, width, height) {
							if (x != null) {
								this._x = x;
							}
							if (y != null) {
								this._y = y;
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
								this._x = x;
							}
							if (y != null) {
								this._y = y;
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

	var DisplayPoint = Point.extend(function(super_) {
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

	//TODO 削除予定
	function isHifiveClass(target) {
		return target && typeof target.getFullName === 'function'
				&& typeof target.getParentClass === 'function';
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

	//TODO 本当はSVGDrawElementのfuncの中に入れたいが
	//Eclipseのフォーマッタと相性が悪い。いずれ方法を検討。
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
				_setAttribute: function(key, value, sync) {
					this._setAttributeNS(null, key, value, sync);
				},
				_setAttributes: function(param, sync) {
					for ( var key in param) {
						if (param.hasOwnProperty(key)) {
							this.setAttribute(key, param[key], sync);
						}
					}
				},
				_setXLinkAttribute: function(key, value, sync) {
					this._setAttributeNS(NS_XLINK, key, value, sync);
				},
				_setXLinkAttributes: function(params, sync) {
					for ( var key in param) {
						if (param.hasOwnProperty(key)) {
							this.setXLinkAttribute(key, param[key], sync);
						}
					}
				},
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
	 * @param {string[]} attrNames
	 */
	function addSimpleXLinkAccessor(target, attrNames) {
		for (var i = 0; i < attrNames.length; i++) {
			var attrName = attrNames[i];
			var name = attrName.replace(/-(.)/g, function(match) {
				return match.charAt(1).toUpperCase();
			});

			target[name] = (function(attrName) {
				return {
					get: function() {
						return this.getXLinkAttribute(attrName);
					},
					set: function(value) {
						this.setXLinkAttribute(attrName, value);
					}
				}
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
				_renderPolyline: function() {
					this._setAttribute('points', this._points.join(' '), true);
				},
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


	var SVGDefinitions = SVGElementWrapper.extend(function(super_) {
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
						// TODO
						return;
					}

					this._definitions.set(id, definition);
					this._element.appendChild(definition._element);
				},
				remove: function(target) {
					var id = this._getId(target);
					if (id === null) {
						// TODO
						return;
					}

					var definition = this._definitions.get(id);
					if (!definition) {
						return;
					}
					this._element.removeChild(definition._element);
				},
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
		function createDefId() {
			return ID_SEQ_PREFIX + idSequence++;
		}

		var desc = {
			name: 'h5.ui.components.stage.SVGGraphics',
			field: {
				_rootSvg: null,
				_defs: null,
				_renderWaitingList: null
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
				constructor: function SVGGraphics(rootSvg, rootDefs) {
					super_.constructor.call(this);
					this._rootSvg = rootSvg;
					this._defs = rootDefs;
					this._renderWaitingList = [];
				},

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
						id = createDefId();
					}

					var element = createSvgElement('linearGradient');
					var gradient = SVGLinearGradient.create(element, id);
					this._addDefinition(gradient);
					return gradient;
				},

				createRadialGradient: function(id) {
					if (id === undefined) {
						id = createDefId();
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
					var idx = $.inArray(key, this._keys);
					if (idx === -1) {
						//このタグは持っていない
						return;
					}
					this._keys.splice(idx, 1);
				},
				has: function(key) {
					return $.inArray(key, this._keys) !== -1;
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
	var DisplayUnit = EventDispatcher.extend(function(super_) {
		var duIdSequence = 0;

		var classDesc = {
			name: 'h5.ui.components.stage.DisplayUnit',
			isAbstract: true,
			field: {
				id: null,

				_x: null,
				_y: null,

				_zIndex: null,

				_width: null,
				_height: null,

				_parentDU: null,

				_rootStage: null,

				_groupTag: null,
				_isVisible: null,

				_belongingLayer: null,

				/**
				 * この要素を現在選択可能かどうか
				 */
				_isSelectable: null,

				_isSelected: null,
				_isFocused: null
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

						this._setDirty(REASON_Z_INDEX_CHANGE);

						var ev = PropertyChangeEvent.create('zIndex', oldValue, this._zIndex);
						this.dispatchEvent(ev);
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
				extraData: null,
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

					this._groupTag = SimpleSet.create();

					this._belongingLayer = null;
				},

				setRect: function(rect) {
					//TODO イベントをあげる回数を減らす（今はセッター側で個別に起きてしまう）。他のAPIも同様
					this._x = rect.x;
					this._y = rect.y;
					this._width = rect.width;
					this._height = rect.height;
					this._setDirty([REASON_SIZE_CHANGE, REASON_POSITION_CHANGE]);
				},

				getRect: function() {
					var rect = Rect.create(this.x, this.y, this.width, this.height);
					return rect;
				},

				setSize: function(width, height) {
					this._width = width;
					this._height = height;
					this._setDirty(REASON_SIZE_CHANGE);
				},

				remove: function() {
					if (this._parentDU) {
						this._parentDU.removeDisplayUnit(this);
					}
				},

				moveTo: function(x, y) {
					this._x = x;
					this._y = y;
					this._setDirty(REASON_POSITION_CHANGE);
				},

				moveBy: function(x, y) {
					this._x += x;
					this._y += y;
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
					var view = this._rootStage._getActiveView();
					var wx = view._viewport.getXLengthOfWorld(x);
					var wy = view._viewport.getYLengthOfWorld(y);
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

					var wgx = this.x;
					var wgy = this.y;

					var parentDU = this._parentDU;
					while (!Layer.isClassOf(parentDU)) {
						var parentPos = parentDU.getWorldGlobalPosition();
						wgx += parentPos.x;
						wgy += parentPos.y;
						parentDU = this._parentDU._parentDU;
					}

					var wpos = WorldPoint.create(wgx, wgy);
					return wpos;
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

				_setDirty: function(reasons) {
					if (!reasons) {
						throw new Error('_setDirty()時は引数のリーズンは必須です。');
					}

					this.__onDirtyNotify(this, reasons);
				},

				_onAddedToRoot: function(stage, belongingLayer) {
					this._rootStage = stage;
					this._belongingLayer = belongingLayer;
				},

				__updateDOM: function(stageView, element, reason) {
					//					if (!this._isVisible) {
					//						//非表示状態なら他の描画はしない
					//						return;
					//					}

					if (reason.isInitialRender || reason.isVisibilityChanged) {
						element.style.display = this._isVisible ? '' : 'none';

						//表示することになったら再レンダー
						//this._setDirty(REASON_ALL);
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

				__renderDOM: function(view) {
					throw new Error('__renderDOMは子クラスでオーバーライドする必要があります。');
				},

				/**
				 * 子孫の要素がdirtyになった場合に子→親に向かって呼び出されるコールバック
				 *
				 * @param du
				 */
				__onDirtyNotify: function(du, reasons) {
					if (this._parentDU) {
						this._parentDU.__onDirtyNotify(du, reasons);
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
				}
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.UpdateReasonSet
				 */
				constructor: function UpdateReasonSet(reasons) {
					super_.constructor.call(this);
					this._reasonMap = {};

					this.add(reasons);
				},

				has: function(type) {
					return (type in this._reasonMap);
				},

				get: function(type) {
					return this._reasonMap[type];
				},

				getAll: function() {
					var ret = [];
					Object.keys(this._reasonMap).forEach(function(key) {
						ret.push(this._reasonMap[key]);
					});
					return ret;
				},

				//UpdateReasonは 最低限typeを持つ（オブジェクトの場合）、または文字列のみでもよい
				add: function(reasons) {
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

				_onAddedToRoot: function(stage, belongingLayer) {
					super_._onAddedToRoot.call(this, stage, belongingLayer);
				},

				__createGraphics: function(view, svgElement) {
					var graphics = this._belongingLayer.__createGraphics(view, svgElement);
					return graphics;
				},

				/**
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

				__updateDOM: function(view, element, reason) {
					super_.__updateDOM.call(this, view, element, reason);
					this._update(view, element, reason);
				},

				_update: function(view, root, reason) {
					if (!this._renderer) {
						//レンダラがセットされていない場合は空の要素を返す
						return;
					}

					var context = {
						displayUnit: this,
						rootElement: root,
						rowIndex: view.rowIndex,
						columnIndex: view.columnIndex,
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

	//TODO Path <- Edge などとする
	//TODO DUからrect系をはずすか
	var Edge = DisplayUnit.extend(function(super_) {
		var ERR_CANNOT_USE_RECT_METHOD = 'EdgeではsetRectは使えません';

		var desc = {
			name: 'h5.ui.components.stage.Edge',
			field: {
				_svgLine: null,
				_from: null,
				_to: null,
				_endpointFrom: null,
				_endpointTo: null,
				_fromSizeChangeHandler: null,
				_toSizeChangeHandler: null,
				_classSet: null
			},

			accessor: {
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

					var that = this;
					this._fromSizeChangeHandler = function() {
						that.requestRender();
					};

					this._classSet = SimpleSet.create();

					this._endpointFrom = EdgeEndpoint.create();
					this._endpointTo = EdgeEndpoint.create();
				},
				setRect: function() {
					throw new Error(ERR_CANNOT_USE_RECT_METHOD);
				},
				_render: function(view, rootSvg, reason) {
					if (!reason.isInitialRender && !reason.isRenderRequested
							&& !reason.isPositionChanged) {
						return;
					}

					//TODO 仮実装
					//バインドされているDUの位置が変わったら再描画が必要
					var fr = this._from.getRect();
					var tr = this._to.getRect();

					var fwPos = this._from.getWorldGlobalPosition();
					var twPos = this._to.getWorldGlobalPosition();

					var line;
					if (rootSvg.firstChild) {
						line = rootSvg.firstChild;
					} else {
						line = createSvgElement('line');
						rootSvg.appendChild(line);
					}

					line.className.baseVal = this.getClassSet().toArray().join(' ');

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
						x1 = fwPos.x + fr.width;
						break;
					case 'offset':
						x1 = fwPos.x + this.endpointFrom.junctionOffsetX;
						break;
					case 'nearest':
						var fwCenterX = fwPos.x + fr.width / 2;
						var twCenterX = twPos.x + tr.width / 2;
						if (twCenterX - fwCenterX > 0) {
							//Toノードの中心がFromノードの中心より右にある＝Fromノード側はright相当にする
							x1 = fwPos.x + fr.width;
						} else {
							x1 = fwPos.x;
						}
						break;
					case 'center':
					default:
						x1 = fwPos.x + fr.width / 2;
						break;
					}

					switch (toHAlign) {
					case 'left':
						x2 = twPos.x;
						break;
					case 'right':
						x2 = twPos.x + tr.width;
						break;
					case 'offset':
						x2 = twPos.x + this.endpointTo.junctionOffsetX;
						break;
					case 'nearest':
						var fwCenterX = fwPos.x + fr.width / 2;
						var twCenterX = twPos.x + tr.width / 2;
						if (twCenterX - fwCenterX > 0) {
							//Toノードの中心がFromノードの中心より右にある＝Toノード側はleft相当にする
							x2 = twPos.x;
						} else {
							x2 = twPos.x + tr.width;
						}
						break;
					case 'center':
					default:
						x2 = twPos.x + tr.width / 2;
						break;
					}

					switch (fromVAlign) {
					case 'top':
						y1 = fwPos.y;
						break;
					case 'bottom':
						y1 = fwPos.y + fr.height;
						break;
					case 'offset':
						y1 = fwPos.y + this.endpointFrom.junctionOffsetY;
						break;
					case 'nearest':
						var fwCenterY = fwPos.y + fr.height / 2;
						var twCenterY = twPos.y + tr.height / 2;
						if (twCenterY - fwCenterY > 0) {
							//Toノードの中心がFromノードの中心より下にある＝Fromノード側はbottom相当にする
							y1 = fwPos.y + fr.height;
						} else {
							y1 = fwPos.y;
						}
						break;
					case 'middle':
					default:
						y1 = fwPos.y + fr.height / 2;
						break;
					}

					switch (toVAlign) {
					case 'top':
						y2 = twPos.y;
						break;
					case 'bottom':
						y2 = twPos.y + tr.height;
						break;
					case 'offset':
						y2 = twPos.y + this.endpointTo.junctionOffsetY;
						break;
					case 'nearest':
						var fwCenterY = fwPos.y + fr.height / 2;
						var twCenterY = twPos.y + tr.height / 2;
						if (twCenterY - fwCenterY > 0) {
							//Toノードの中心がFromノードの中心より下にある＝Toノード側はtop相当にする
							y2 = twPos.y;
						} else {
							y2 = twPos.y + tr.height;
						}
						break;
					case 'middle':
					default:
						y2 = twPos.y + tr.height / 2;
						break;
					}

					var rx = x1 <= x2 ? x1 : x2;
					var ry = y1 <= y2 ? y1 : y2;
					var rw = x2 - x1;
					if (rw < 0) {
						rw *= -1;
					}
					var rh = y2 - y1;
					if (rh < 0) {
						rh *= -1;
					}

					setSvgAttributes(line, {
						x1: x1,
						y1: y1,
						x2: x2,
						y2: y2
					});
				},

				hasClass: function(cssClass) {
					return this._classSet.has(cssClass);
				},

				addClass: function(cssClass) {
					this._classSet.add(cssClass);
				},

				removeClass: function(cssClass) {
					this._classSet.remove(cssClass);
				},

				clearClass: function() {
					this._classSet.clear();
				},

				getClassSet: function() {
					return this._classSet;
				},

				//TODO BasicDUにも同じメソッドがある。クラス階層について要検討
				requestRender: function() {
					//TODO 正しくは次の再描画フレームで描画
					if (!this._rootStage) {
						return;
					}

					this._setDirty(REASON_RENDER_REQUEST);
				},

				_onAddedToRoot: function(stage, belongingLayer) {
					this._rootStage = stage;
					this._belongingLayer = belongingLayer;

					this._from.addEventListener('sizeChange', this._fromSizeChangeHandler);
					this._to.addEventListener('sizeChange', this._fromSizeChangeHandler);
					this._from.addEventListener('positionChange', this._fromSizeChangeHandler);
					this._to.addEventListener('positionChange', this._fromSizeChangeHandler);

					this.requestRender();
				},

				_onRemove: function() {
					this._from.removeEventListener('sizeChange', this._fromSizeChangeHandler);
					this._to.removeEventListener('sizeChange', this._fromSizeChangeHandler);
					this._from.removeEventListener('positionChange', this._fromSizeChangeHandler);
					this._to.removeEventListener('positionChange', this._fromSizeChangeHandler);
				},

				__renderDOM: function(view) {
					var rootSvg = createSvgElement('svg');
					rootSvg.setAttribute('data-stage-role', 'edge'); //TODO for debugging
					rootSvg.setAttribute('data-h5-dyn-du-id', this.id); //TODO for debugging

					//エッジの表示が切れないようにvisibleにする
					rootSvg.style.overflow = "visible";

					var reason = UpdateReasonSet.create(REASON_INITIAL_RENDER);

					this.__updateDOM(view, rootSvg, reason);

					return rootSvg;
				},

				__updateDOM: function(view, element, reason) {
					super_.__updateDOM.call(this, view, element, reason);
					this._render(view, element, reason);
				}
			}
		};
		return desc;
	});

	var EdgeEndpoint = RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.EdgeEndpoint',

			accessor: {
				//top, middle, bottom, offset, nearest, null
				junctionVerticalAlign: null,

				//left, center, right, offset, nearest, null
				junctionHorizontalAlign: null,

				//Alignがoffsetの場合のみ有効
				junctionOffsetX: null,
				junctionOffsetY: null
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

		var StageUtil = h5.ui.components.stage.StageUtil;

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
				_isUpdateTransformReserved: null,
				_zIndexList: null
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

					this._zIndexList = ZIndexList.create();

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

					this._zIndexList.add(du.zIndex, du);

					if (this._rootStage) {
						du._onAddedToRoot(this._rootStage, this._belongingLayer);
					}

					//このコンテナにDUが追加されたことをLayerまで通知・伝播
					//注：ここで、parentDU.__onDescendantAdded()としてはいけない。
					//Layerなど、自分の__onDescendantAdded()をオーバーライドしている場合に
					//正しく動作しなくなるため。
					this.__onDescendantAdded(du);

					//TODO コンテナごとにはイベントをあげず、Layerで集約する
					//					var event = DisplayUnitContainerEvent.create('add');
					//					event.displayUnit = du;
					//					this.dispatchEvent(event);
				},

				removeDisplayUnit: function(du) {
					var idx = this._children.indexOf(du);
					if (idx === -1) {
						return;
					}

					//削除されるDU側にクリーンアップのタイミングを与える
					//TODO ここで記述するのがよいか？
					if (typeof du._onRemove === 'function') {
						du._onRemove();
					}

					this._zIndexList.remove(du.zIndex, du);

					this._children.splice(idx, 1);

					du._parentDU = null;

					//TODO 指定されたduがコンテナの場合にそのduの子供のrootStageも再帰的にnullにする
					du._rootStage = null;

					this.__onDescendantRemoved(du, this);

					//TODO イベントは直接あげずLayerで集約
					//var event = DisplayUnitContainerEvent.create('remove');
					//event.displayUnit = du;
					//this.dispatchEvent(event);
				},

				getDisplayUnitById: function(id) {
					var ret = getDisplayUnitByIdInner(this, id);
					return ret;
				},

				getDisplayUnitAll: function() {
					return this._children;
				},

				/**
				 * オーバーライド
				 *
				 * @overrides
				 * @param rootStage
				 * @param belongingLayer
				 */
				_onAddedToRoot: function(rootStage, belongingLayer) {
					super_._onAddedToRoot.call(this, rootStage, belongingLayer);

					var children = this._children;
					for (var i = 0, len = children.length; i < len; i++) {
						var du = children[i];
						du._onAddedToRoot(rootStage, belongingLayer);
					}
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

				_updateTransform: function(element) {
					var transform = h5.u.str.format('scale({0},{1}) translate({2},{3})',
							this._scaleX, this._scaleY, -this._scrollX, -this._scrollY);

					//直下のgタグに対してtransformをかける
					element.firstChild.setAttribute('transform', transform);
				},

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

					var children = this._zIndexList.getAllAcendant();

					var childrenLen = children.length;
					for (var i = 0; i < childrenLen; i++) {
						var childDU = children[i];
						var dom = childDU.__renderDOM(view);
						rootG.appendChild(dom);
					}

					return rootSvg;
				},

				__addDOM: function(view, containerElement, targetElement) {
					//TODO zIndex対応
					containerElement.firstChild.appendChild(targetElement);
				},

				__removeDOM: function(view, containerElement, targetElement) {
					//TODO zIndex対応
					containerElement.firstChild.removeChild(targetElement);
				},

				__updateDOM: function(view, element, reason) {
					super_.__updateDOM.call(this, view, element, reason);

					if (reason.isScaleChanged || reason.isScrollPositionChanged) {
						this._updateTransform(element);
					}
				},

				/**
				 * 子孫に要素が追加されたときに子⇒親に向かって呼び出されるコールバック
				 *
				 * @param targetDU
				 */
				__onDescendantAdded: function(displayUnit) {
					if (this._parentDU) {
						this._parentDU.__onDescendantAdded(displayUnit);
					}
				},

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
	var Layer = DisplayUnitContainer
			.extend(function(super_) {
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
							throw new Error(
									'Layerは動かせません。スクロール位置を変更したい場合はStageView.scrollTo()を使用してください。');

							//							this.x = worldX;
							//							this.y = worldY;
							//							this._updateTransform();
						},

						/**
						 * オーバーライド。レイヤーのmoveはsvgの属性ではなくtranslateで行う(scaleと合わせて行うため)
						 *
						 * @param worldX
						 * @param worldY
						 */
						moveBy: function(worldX, worldY) {
							throw new Error(
									'Layerは動かせません。スクロール位置を変更したい場合はStageView.scrollTo()を使用してください。');

							//							var x = this.x + worldX;
							//							var y = this.y + worldY;
							//							this.scrollTo(x, y);
						},

						__createGraphics: function(stageView, svgRoot) {
							var SVGGraphics = h5.cls.manager
									.getClass('h5.ui.components.stage.SVGGraphics');

							var defs = stageView.getDefsForLayer(this);

							var graphics = SVGGraphics.create(svgRoot, defs);
							return graphics;
						},

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

						__renderDOM: function(view) {
							var children = this._zIndexList.getAllAcendant();

							var layerElement = view.getElementForLayer(this);

							var childrenLen = children.length;
							for (var i = 0; i < childrenLen; i++) {
								var childDU = children[i];
								var dom = childDU.__renderDOM(view);
								this.__addDOM(view, layerElement, dom);
							}

							return null;
						},

						/**
						 * オーバーライド
						 *
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
						 * オーバーライド
						 *
						 * @param targetDU
						 * @param parentDU
						 */
						__onDescendantAdded: function(displayUnit) {
							var event = DisplayUnitContainerEvent.create('displayUnitAdd');
							event.displayUnit = displayUnit;
							this.dispatchEvent(event);
						},

						/**
						 * オーバーライド
						 *
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
						 * @param stage
						 * @param belongingLayer
						 */
						_onAddedToRoot: function(stage, belongingLayer) {
							var children = this._children;
							for (var i = 0, len = children.length; i < len; i++) {
								var du = children[i];
								du._onAddedToRoot(this._rootStage, this._belongingLayer);
							}
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

	h5.u.obj.expose('h5.ui.components.stage', {
		BasicDisplayUnit: BasicDisplayUnit,
		Layer: Layer,
		DisplayUnitContainer: DisplayUnitContainer,
		Rect: Rect,
		Point: Point,
		WorldPoint: WorldPoint,
		DisplayPoint: DisplayPoint,
		Edge: Edge,
		SVGLinearGradient: SVGLinearGradient
	});

})(jQuery);

(function() {

	var stageLogic = {
		__name: 'h5.ui.components.stage.StageLogic'
	};

	h5.core.expose(stageLogic);

})();

(function($) {
	'use strict';

	var RootClass = h5.cls.RootClass;
	var stageModule = h5.ui.components.stage;

	var Event = h5.cls.manager.getClass('h5.event.Event');
	var EventDispatcher = h5.cls.manager.getClass('h5.event.EventDispatcher');

	var DisplayPoint = h5.cls.manager.getClass('h5.ui.components.stage.DisplayPoint');
	var BulkOperation = h5.cls.manager.getClass('h5.ui.components.stage.BulkOperation');
	var Layer = h5.cls.manager.getClass('h5.ui.components.stage.Layer');
	var DragSession = h5.cls.manager.getClass('h5.ui.components.stage.DragSession');
	var UpdateReasonSet = h5.cls.manager.getClass('h5.ui.components.stage.UpdateReasonSet');
	var UpdateReasons = h5.ui.components.stage.UpdateReasons;

	var SvgUtil = h5.ui.components.stage.SvgUtil;

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
				},
			},

			method: {
				/**
				 * @memberOf h5.ui.components.stage.Viewport
				 */
				constructor: function Viewport() {
					super_.constructor.call(this);
					this._displayRect = stageModule.Rect.create();
					this._worldRect = stageModule.Rect.create();
					this._scaleX = 1;
					this._scaleY = 1;
					this.boundaryWidth = DEFAULT_BOUNDARY_WIDTH;
				},

				setDisplaySize: function(dispWidth, dispHeight) {
					this.setDisplayRect(null, null, dispWidth, dispHeight);
				},

				getDisplayRect: function() {
					var rect = stageModule.Rect.create(this._displayRect.x, this._displayRect.y,
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
					var rect = stageModule.Rect.create(this._worldRect.x, this._worldRect.y,
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
					var point = stageModule.WorldPoint.create(wx, wy);
					return point;
				},

				getDisplayPositionFromDisplayOffset: function(displayOffsetX, displayOffsetY) {
					var dispX = this.displayX + displayOffsetX;
					var dispY = this.displayY + displayOffsetY;
					var point = DisplayPoint.create(dispX, dispY);
					return point;
				},

				getXLengthOfWorld: function(displayXLength) {
					return displayXLength / this._scaleX;
				},

				getYLengthOfWorld: function(displayYLength) {
					return displayYLength / this._scaleY;
				},

				getXLengthOfDisplay: function(worldXLength) {
					return worldXLength * this._scaleX;
				},

				getYLengthOfDisplay: function(worldYLength) {
					return worldYLength * this._scaleY;
				},

				getWorldPosition: function(displayX, displayY) {
					var wx = displayX / this._scaleX;
					var wy = displayY / this._scaleY;
					var point = stageModule.WorldPoint.create(wx, wy);
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
				}
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
				toWorldXLength: function(displayXLength) {
					return this._viewport.getXLengthOfWorld(displayXLength);
				},
				toWorldYLength: function(displayYLength) {
					return this._viewport.getYLengthOfWorld(displayYLength);
				},
				toDisplayPosition: function(worldX, worldY) {
					var x;
					var y;
					if (arguments.length === 1 && stageModule.WorldPoint.isClassOf(worldX)) {
						x = worldX.x;
						y = worldX.y;
					} else {
						x = worldX;
						y = worldY;
					}
					return this._viewport.getDisplayPosition(x, y);
				},
			}
		};
		return desc;
	});

	var StageView = EventDispatcher
			.extend(function(super_) {
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

						/**
						 * 実際にDOMを描画する範囲
						 */
						_renderRect: null,

						_layerDOMs: null,

						_layerElementMap: null,

						_isUpdateTransformReserved: null,

						_scrollRangeX: null,
						_scrollRangeY: null,

						_scaleRangeX: null,
						_scaleRangeY: null,

						_layerDefsMap: null,

						_rowIndex: null,
						_columnIndex: null,

						_duAddListener: null,
						_duRemoveListener: null,
						_duDirtyListener: null,

						_viewportRectChangeListener: null,
						_viewportScaleChangeListener: null,
						_isViewportEventSuppressed: null,

						_dragTargetDUInfoMap: null,

						_dragSelectOverlayRect: null
					},

					accessor: {
						x: {
							get: function() {
								return this._x;
							},
							set: function(value) {
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
							},
							set: function(value) {
								var currentWidth = this._viewport.displayWidth;

								if (value === currentWidth) {
									return;
								}

								this._viewport.setDisplaySize(value, this._viewport.displayHeight);

								if (this._rootElement) {
									if (value < 0) {
										value = 0;
									}

									$(this._rootElement).css({
										width: value
									});

									//注：レイヤーに対してはサイズを設定してはいけない。
									//レイヤーに設定すると、全てのマウスイベントを最前面のレイヤーで受けてしまうため。
								}
							}
						},
						height: {
							get: function() {
								return this._viewport.displayHeight;
							},
							set: function(value) {
								var currentHeight = this._viewport.displayHeight;

								if (value === currentHeight) {
									return;
								}

								this._viewport.setDisplaySize(this._viewport.displayWidth, value);

								if (this._rootElement) {
									if (value < 0) {
										value = 0;
									}

									$(this._rootElement).css({
										height: value
									});

									//注：レイヤーに対してはサイズを設定してはいけない。
									//レイヤーに設定すると、全てのマウスイベントを最前面のレイヤーで受けてしまうため。
								}

								//								var event = PropertyChangeEvent.create('height', oldValue, value);
								//								this.dispatchEvent(event);
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
						}
					},

					method: {
						/**
						 * @memberOf h5.ui.components.stage.StageView
						 */
						constructor: function StageView(stage) {
							super_.constructor.call(this);
							this._stage = stage;
							this._x = 0;
							this._y = 0;

							var viewport = Viewport.create();
							this._viewport = viewport;

							this._layerDOMs = [];

							this._layerElementMap = new Map();

							this._layerDefsMap = new Map();

							this._isUpdateTransformReserved = false;

							this._scrollRangeX = {
								min: null,
								max: null
							};

							this._scrollRangeY = {
								min: null,
								max: null
							};

							this._scaleRangeX = {
								min: ABSOLUTE_SCALE_MIN,
								max: null
							};

							this._scaleRangeY = {
								min: ABSOLUTE_SCALE_MIN,
								max: null
							};

							this._coordinateConverter = CoordinateConverter.create(this._viewport);

							var that = this;
							this._viewportRectChangeListener = function(event) {
								that._onViewportRectChange(event);
							};
							this._viewportScaleChangeListener = function(event) {
								that._onViewportScaleChange(event);
							};
							viewport.addEventListener('rectChange',
									this._viewportRectChangeListener);
							viewport.addEventListener('scaleChange',
									this._viewportScaleChangeListener);

							//TODO 別の方法があれば
							this._isViewportEventSuppressed = false;
						},

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
								overflow: 'visible'
							});

							this._foremostSvg = foremostSvg;
							this._foremostSvgGroup = foremostG;
							this._rootElement.appendChild(foremostSvg);
						},

						init: function() {
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
								this._layerElementMap.set(layer, layerRootElement);

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

								stageModule.SvgUtil.setAttributes(layerRootElement, {
									overflow: 'visible'
								});

								layer.__renderDOM(this);

								layer.addEventListener('displayUnitAdd', this._duAddListener);
								layer.addEventListener('displayUnitRemove', this._duRemoveListener);
								layer.addEventListener('displayUnitDirty', this._duDirtyListener);

								//先にaddしたレイヤーの方が手前に来るようにする
								//layers配列的にはindexが若い＝手前、DOM的には後の子になるようにする
								this._rootElement.appendChild(layerRootElement);
							}

							this._initForemostSvg();

							this._updateLayerScrollPosition();
						},

						__onSelectDUStart: function(dragSelectStartPos) {
							var rect = SvgUtil.createElement('rect');
							this._dragSelectOverlayRect = rect;

							rect.className.baseVal = ('stageDragSelectRangeOverlay');
							stageModule.SvgUtil.setAttributes(rect, {
								x: dragSelectStartPos.x,
								y: dragSelectStartPos.y,
								width: 0,
								height: 0,
								'pointer-events': 'none'
							});

							this._foremostSvgGroup.appendChild(rect);
						},

						__onSelectDUMove: function(worldPos, worldWidth, worldHeight) {
							SvgUtil.setAttributes(this._dragSelectOverlayRect, {
								x: worldPos.x,
								y: worldPos.y,
								width: worldWidth,
								height: worldHeight
							});
						},

						__onSelectDUEnd: function() {
							$(this._dragSelectOverlayRect).remove();
						},

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

								//強制的に元のDUをisVisible = falseにするため
								//元のisVisibleを覚えておく
								//TODO isVisibleを内部的なものにした方が良い
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
								du.isVisible = false;
							});
						},

						__onDragDUMove: function(dragSession) {
							this._dragTargetDUInfoMap.forEach(function(element, du) {
								var gpos = du.getWorldGlobalPosition();
								SvgUtil.setAttributes(element, {
									x: gpos.x,
									y: gpos.y
								});
							});
						},

						__onDragDUDrop: function(dragSession) {
							this._dragTargetDUInfoMap.forEach(function(element, du) {
								du.isVisible = element.isVisible;
							});

							this._dragTargetDUInfoMap = null;

							//フォアレイヤーのDOMを削除する
							$(this._foremostSvgGroup).empty();
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

							this._viewport.removeEventListener('rectChange',
									this._viewportRectChangeListener);
							this._viewport.removeEventListener('scaleChange',
									this._viewportScaleChangeListener);

							$(this._rootElement).remove();
						},

						setSize: function(displayWidth, displayHeight) {
							this._viewport.setDisplaySize(displayWidth, displayHeight);
						},

						getScrollPosition: function() {
							var pos = DisplayPoint.create(this._viewport.displayX,
									this._viewport.displayY);
							return pos;
						},

						scrollTo: function(dispX, dispY) {
							this._scrollTo(dispX, dispY);
						},

						_scrollTo: function(dispX, dispY) {
							var oldPos = DisplayPoint.create(this._viewport.displayX,
									this._viewport.displayY);

							var actualDispX = StageUtil.clamp(dispX, this._scrollRangeX.min,
									this._scrollRangeX.max);
							var actualDispY = StageUtil.clamp(dispY, this._scrollRangeY.min,
									this._scrollRangeY.max);

							var actualDiff = {
								dx: actualDispX - this._viewport.displayX,
								dy: actualDispY - this._viewport.displayY
							};

							if (this._viewport.displayX === actualDispX
									&& this._viewport.displayY === actualDispY) {
								//サイズが現在と変わらなかったら何もしない
								return actualDiff;
							}

							this._viewport.scrollTo(actualDispX, actualDispY);

							this._updateLayerScrollPosition();

							var newPos = DisplayPoint.create(actualDispX, actualDispY);

							//TODO 現在はこの場所でイベントを出しているが、
							//将来的にはrefresh()のスロットの中で（非同期化された描画更新フレーム処理の中で）
							//描画更新後にイベントをあげるようにする
							var evArg = {
								view: this,

								scrollPosition: {
									oldValue: oldPos,
									newValue: newPos,
									isChanged: true
								},
								scale: {
									oldValue: {
										x: this._viewport.scaleX,
										y: this._viewport.scaleY
									},
									newValue: {
										x: this._viewport.scaleX,
										y: this._viewport.scaleY
									},
									isChanged: false
								}
							};

							this._stage.trigger(EVENT_SIGHT_CHANGE, evArg);

							return actualDiff;
						},

						scrollBy: function(displayDx, displayDy) {
							this._scrollBy(displayDx, displayDy);
						},

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
						 * @param displayOffsetX
						 *            拡縮時の中心点のx（ディスプレイ座標系におけるoffsetX(stageのルート要素の左上を基準とした座標)）
						 * @param displayOffsetY 拡縮時の中心点のy（仕様はxと同じ）
						 */
						setScale: function(scaleX, scaleY, displayOffsetX, displayOffsetY) {
							var actualScaleX = StageUtil.clamp(scaleX, this._scaleRangeX.min,
									this._scaleRangeX.max);
							var actualScaleY = StageUtil.clamp(scaleY, this._scaleRangeY.min,
									this._scaleRangeY.max);

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

							var offX = displayOffsetX;
							var offY = displayOffsetY;

							if (displayOffsetX == null && displayOffsetY == null) {
								var rootOffset = $(this._rootElement).offset();
								if (displayOffsetX == null) {
									offX = rootOffset.left + this._viewport.displayWidth / 2;
								}
								if (displayOffsetY == null) {
									offY = rootOffset.top + this._viewport.displayHeight / 2;
								}
							}

							var scaleCenter = this._viewport.getWorldPositionFromDisplayOffset(
									offX, offY);

							var oldScrollPos = DisplayPoint.create(this._viewport.displayX,
									this._viewport.displayY);
							var oldScaleX = this._viewport.scaleX;
							var oldScaleY = this._viewport.scaleY;

							this._viewport.setScale(actualScaleX, actualScaleY, scaleCenter.x,
									scaleCenter.y);

							//TODO clampする、もしくはscrollTo()する
							var newScrollPos = DisplayPoint.create(this._viewport.displayX,
									this._viewport.displayY);

							var isScrollPoisitionChanged = true;
							if (oldScrollPos.x === newScrollPos.x
									&& oldScrollPos.y === newScrollPos.y) {
								isScrollPoisitionChanged = false;
							}

							this._updateLayerScrollPosition();

							//TODO 現在はこの場所でイベントを出しているが、
							//将来的にはrefresh()のスロットの中で（非同期化された描画更新フレーム処理の中で）
							//描画更新後にイベントをあげるようにする
							//TODO StageView側からイベントをあげて、それをさらにStageControllerであげる
							var evArg = {
								view: this,

								scrollPosition: {
									oldValue: oldScrollPos,
									newValue: newScrollPos,
									isChanged: isScrollPoisitionChanged
								},
								scale: {
									oldValue: {
										x: oldScaleX,
										y: oldScaleY
									},
									newValue: {
										x: actualScaleX,
										y: actualScaleY
									},
									isChanged: true
								}
							};
							this._stage.trigger(EVENT_SIGHT_CHANGE, evArg);
						},

						setScaleRangeX: function(min, max) {
							var actualMin = StageUtil.clamp(min, ABSOLUTE_SCALE_MIN, null);

							this._scaleRangeX = {
								min: actualMin,
								max: max
							};

							this.setScale(this._viewport.scaleX, null);
						},

						setScaleRangeY: function(min, max) {
							var actualMin = StageUtil.clamp(min, ABSOLUTE_SCALE_MIN, null);

							this._scaleRangeY = {
								min: actualMin,
								max: max
							};

							this.setScale(null, this._viewport.scaleY);
						},

						setScrollRangeX: function(minDisplayX, maxDisplayX) {
							this._scrollRangeX = {
								min: minDisplayX,
								max: maxDisplayX
							};
						},

						setScrollRangeY: function(minDisplayY, maxDisplayY) {
							this._scrollRangeY = {
								min: minDisplayY,
								max: maxDisplayY
							};
						},

						getDefsForLayer: function(layer) {
							var defs = this._layerDefsMap.get(layer);

							if (!defs) {
								var layerElement = this._layerElementMap.get(layer);
								var element = document.createElementNS(
										'http://www.w3.org/2000/svg', 'defs');
								layerElement.appendChild(element);

								var SVGDefinitions = h5.cls.manager
										.getClass('h5.ui.components.stage.SVGDefinitions');
								defs = SVGDefinitions.create(element);
								this._layerDefsMap.set(layer, defs);
							}

							return defs;
						},

						getElementForLayer: function(layer) {
							var elem = this._layerElementMap.get(layer);
							return elem;
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

							if (this._rootElement.compareDocumentPosition(element)
									& Node.DOCUMENT_POSITION_CONTAINED_BY) {
								//ルート要素の子要素ならtrue
								return true;
							}
							return false;
						},

						_updateLayerScrollPosition: function() {
							var layers = this._stage._layers;

							for (var i = 0, len = layers.length; i < len; i++) {
								var layer = layers[i];

								var scrollX = -this._viewport.worldX;
								var scrollY = -this._viewport.worldY;

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

								var dom = this._layerElementMap.get(layer);
								this._updateTransform(dom, scrollX, scrollY);

								//								layer.setScale(that._viewport.scaleX, that._viewport.scaleY);
								//								layer.moveTo(scrollX, scrollY);
							}

							//フォアレイヤーのスクロール位置も移動させる
							this._updateTransform(this._foremostSvg, scrollX, scrollY);
						},


						/**
						 * レイヤーではtranslate量にDUのx,yの値を用いる。
						 *
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

						_onDUDirty: function(event) {
							var du = event.displayUnit;

							//TODO findでなくDOMマップを持つ
							var $dom = $(this._rootElement).find(
									'[data-h5-dyn-du-id="' + du.id + '"]');
							if (!$dom[0]) {
								//対応するDOMが存在しない
								return;
							}

							du.__updateDOM(this, $dom[0], event.reason);
						},

						_onDUAdd: function(event) {
							var du = event.displayUnit;

							var reason = UpdateReasonSet.create(UpdateReasons.INITIAL_RENDER);

							var dom = du.__renderDOM(this, reason);

							//TODO DOMから探すのではなく、DUID -> Element のMapを持つ
							var $parent = $(this._rootElement).find(
									'[data-h5-dyn-du-id="' + du.parentDisplayUnit.id + '"]');

							//DOMの追加方法は
							var parentDU = du.parentDisplayUnit;

							var parentDOM = $parent[0];

							if (parentDOM === undefined) {
								//親に対応するDOMが見つからなかったということは
								//レイヤーに直接追加されたもの
								//（コンテナ追加時、それまでのコンテナ以下の要素はレンダー済みだから必ず存在する）
								//$(this._rootElement).append(dom);

								//このparentDUは必ずLayer
								parentDOM = this._layerElementMap.get(parentDU);
							}
							parentDU.__addDOM(this, parentDOM, dom);
						},

						_onDURemove: function(event) {
							var du = event.displayUnit;

							var targetElement = $(this._rootElement).find(
									'[data-h5-dyn-du-id="' + du.id + '"]')[0];

							if (!targetElement) {
								//対象のDOMを描画していなければ何もしない
								return;
							}

							//具体的なDOMの削除方法はコンテナ自身が知っているのでコンテナを取得する
							//なお、ターゲットのDU自身は既に削除された後なので
							//parentDisplayUnitを参照してもnullなので注意。
							var parentDU = event.parentDisplayUnit;

							//TODO DOMから探すのではなく、DUID -> Element のMapを持つ
							var $parent = $(this._rootElement).find(
									'[data-h5-dyn-du-id="' + parentDU.id + '"]');
							var parentDOM = $parent[0];

							if (parentDOM === undefined) {
								//親に対応するDOMが見つからなかったということは
								//レイヤーに直接追加されたもの
								//TODO 現時点では、コンテナ追加時、それまでのコンテナ以下の要素はレンダー済みだから必ず存在する

								//このparentDUは必ずLayer
								parentDOM = this._layerElementMap.get(parentDU);
							}

							parentDU.__removeDOM(this, parentDOM, targetElement);
						},

						_onViewportRectChange: function(event) {
							if (this._isViewportEventSuppressed) {
								return;
							}

							var event = Event.create('viewportRectChange');
							this.dispatchEvent(event);
						},

						_onViewportScaleChange: function(event) {
							if (this._isViewportEventSuppressed) {
								return;
							}

							var event = Event.create('viewportScaleChange');
							this.dispatchEvent(event);
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

	var StageGridRow = RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.StageGridRow',

			field: {
				_viewCollection: null,
				_type: null,
				_desiredHeight: null,
				_index: null,
				_overallIndex: null,
				_scrollBarMode: null,

				_scrollBarController: null
			},

			accessor: {
				height: {
					get: function() {
						if (this._type === GRID_TYPE_SEPARATOR) {
							return this._desiredHeight;
						}

						try {
							var firstColumnView = this._viewCollection.getView(this._index, 0);
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
				constructor: function StageGridRow(viewCollection, type, index, overallIndex,
						scrollBarMode) {
					super_.constructor.call(this);
					this._viewCollection = viewCollection;
					this._type = type;
					this._desiredHeight = null;
					this._index = index;
					this._overallIndex = overallIndex;
					this._scrollBarMode = scrollBarMode;
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
				}
			}
		};
		return desc;
	});

	var StageGridColumn = RootClass.extend(function(super_) {
		var desc = {
			name: 'h5.ui.components.stage.StageGridColumn',

			field: {
				_viewCollection: null,
				_type: null,
				_desiredWidth: null,
				_index: null,
				_overallIndex: null,
				_scrollBarMode: null,
				_scrollBarController: null
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
				constructor: function StageGridColumn(viewCollection, type, index, overallIndex,
						scrollBarMode) {
					super_.constructor.call(this);
					this._type = type;
					this._desiredWidth = null;
					this._viewCollection = viewCollection;
					this._index = index;
					this._overallIndex = overallIndex;
					this._scrollBarMode = scrollBarMode;
				},

				getView: function(rowIndex) {
					if (this._type === GRID_TYPE_SEPARATOR) {
						return null; //TODO 例外を出す方が良い？
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

						_viewportRectChangeListener: null,
						_viewportScaleChangeListener: null,

						_draggingTargetDUVisibleMap: null
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

							//初期状態では「何もない」ことにする
							this._numberOfOverallRows = 0;
							this._numberOfOverallColumns = 0;
							this._numberOfRows = 0;
							this._numberOfColumns = 0;
							this._numberOfRowSeparators = 0;
							this._numberOfColumnSeparators = 0;

							this._rows = [];
							this._columns = [];

							var that = this;
							this._viewportRectChangeListener = function(event) {
								that._onViewportRectChange(event);
							};
							this._viewportScaleChangeListener = function(event) {
								that._onViewportScaleChange(event);
							};
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

						_clear: function() {
							var views = this.getViewAll();
							var that = this;
							views.forEach(function(v) {
								v.removeEventListener('viewportRectChange',
										that._viewportRectChangeListener);
								v.removeEventListener('viewportScaleChange',
										that._viewportScaleChangeListener);
							});

							this.getRows().forEach(function(row) {
								that._setRowScrollBarMode(row, SCROLL_BAR_MODE_NONE);
							});

							this.getColumns().forEach(function(col) {
								that._setRowScrollBarMode(col, SCROLL_BAR_MODE_NONE);
							});

							this._numberOfOverallRows = 0;
							this._numberOfOverallColumns = 0;
							this._numberOfRows = 0;
							this._numberOfColumns = 0;
							this._numberOfRowSeparators = 0;
							this._numberOfColumnSeparators = 0;

							this._activeView = null;
							this._viewMap = {};
						},

						_addView: function(view, rowIndex, columnIndex) {
							var rowMap = this._viewMap[rowIndex];
							if (!rowMap) {
								rowMap = {};
								this._viewMap[rowIndex] = rowMap;
							}
							rowMap[columnIndex] = view;
							view._rowIndex = rowIndex;
							view._columnIndex = columnIndex;

							view.addEventListener('viewportRectChange',
									this._viewportRectChangeListener);
							view.addEventListener('viewportScaleChange',
									this._viewportScaleChangeListener);
						},

						_makeGrid: function(horizontalSplitDefinitions, verticalSplitDefinitions,
								rootWidth, rootHeight) {

							//セパレータは一旦削除し、グリッド構成時に改めて作成
							$(this._stage.rootElement).find('.stageGridSeparator').remove();

							//一度ビューを作成済みで、すべての分割を解除する場合
							//					if (!horizontalSplitDefinitions && !verticalSplitDefinitions
							//							&& this._activeView) {
							//						//分割・複製を解除完全に解除する場合、直前のActiveViewを残す
							//						var topLeftView = this.getView(0, 0);
							//						this._clear();
							//						this._addView(topLeftView, 0, 0);
							//						this.setActiveView(topLeftView, true);
							//						//TODO サイズ変更
							//						//this._updateRootSize();
							//						return;
							//					}

							//ビューを使いまわせるように直前のマップと行数・列数を保持しておく
							var oldViewMap = this._viewMap;
							var oldNumOfRows = this.numberOfRows;
							var oldNumOfCols = this.numberOfColumns;
							var oldViews = this.getViewAll();
							var oldActiveView = this.getActiveView();

							//内部状態をクリア
							this._clear();

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
									stageGridRow = StageGridRow.create(this, GRID_TYPE_SEPARATOR,
											numOfRowSeps, rowOverallIndex, SCROLL_BAR_MODE_NONE);
									var desiredHeight = def.height != null ? def.height
											: DEFAULT_GRID_SEPARATOR_THICKNESS;
									stageGridRow._desiredHeight = desiredHeight;

									//セパレータは縦・横にまたがって作るので、このループの中で作ってしまう
									//セパレータにはoverallIndexを持たせる
									$createGridSeparator(rowOverallIndex, true, desiredHeight,
											totalHeight).appendTo(this._stage.rootElement);

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
									stageGridCol = StageGridColumn.create(this,
											GRID_TYPE_SEPARATOR, numOfColSeps, colOverallIndex,
											SCROLL_BAR_MODE_NONE);
									stageGridCol._desiredWidth = def.width != null ? def.width
											: DEFAULT_GRID_SEPARATOR_THICKNESS;

									//セパレータは縦・横にまたがって作るので、このループの中で作ってしまう
									//セパレータにはoverallIndexを持たせる
									$createGridSeparator(colOverallIndex, false,
											stageGridCol._desiredWidth, totalWidth).appendTo(
											this._stage.rootElement);

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

								var viewH = row._desiredHeight ? row._desiredHeight : rootHeight
										- totalHeight;

								//								if ((hDefIndex + 1) === hDefsLen
								//										&& hDef.scrollBarMode === SCROLL_BAR_MODE_ALWAYS) {
								//									//最後の行のビューで、かつスクロールバーを常に出す指定があった場合は
								//									//一番下のビューからスクロールバーの高さを引く
								//									viewH -= SCROLL_BAR_THICKNESS;
								//								}

								for (var vDefIndex = 0; vDefIndex < vDefsLen; vDefIndex++) {
									var vDef = verticalSplitDefinitions[vDefIndex];
									var col = cols[vDefIndex];

									if (vDef.type === GRID_TYPE_SEPARATOR) {
										totalWidth += col._desiredWidth ? col._desiredWidth : 0;
										continue;
									}

									var theView;

									if (rowIndex < oldNumOfRows && colIndex < oldNumOfCols) {
										//今回の位置と同じ位置にビューがあれば再利用する
										theView = this._getView(oldViewMap, rowIndex, colIndex);
										reusedViews.push(theView);
									} else {
										//新規にビューを作成する
										theView = StageView.create(this._stage);
										theView.init();
									}

									this._addView(theView, rowIndex, colIndex);

									var viewW = col._desiredWidth ? col._desiredWidth : rootWidth
											- totalWidth;

									//									if ((vDefIndex + 1) === vDefsLen
									//											&& vDef.scrollBarMode === SCROLL_BAR_MODE_ALWAYS) {
									//										viewW -= SCROLL_BAR_THICKNESS;
									//									}

									theView.x = totalWidth;
									theView.y = totalHeight;
									theView.height = viewH;
									theView.width = viewW;

									if (hDef.scrollRangeX) {
										theView.setScrollRangeX(hDef.scrollRangeX.min,
												hDef.scrollRangeX.max);
										var scrPos = theView.getScrollPosition();
										theView.scrollTo(hDef.scrollRangeX.min, scrPos.y);
									}

									if (hDef.scrollRangeY) {
										theView.setScrollRangeY(hDef.scrollRangeY.min,
												hDef.scrollRangeY.max);
										var scrPos = theView.getScrollPosition();
										theView.scrollTo(scrPos.x, hDef.scrollRangeY.min);
									}

									if (vDef.scrollRangeX) {
										theView.setScrollRangeX(vDef.scrollRangeX.min,
												vDef.scrollRangeX.max);
										var scrPos = theView.getScrollPosition();
										theView.scrollTo(vDef.scrollRangeX.min, scrPos.y);
									}

									if (vDef.scrollRangeY) {
										theView.setScrollRangeY(vDef.scrollRangeY.min,
												vDef.scrollRangeY.max);
										theView.scrollTo(scrPos.x, vDef.scrollRangeY.min);
									}

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

							//全てのビューのスケールを合わせる
							for (var rowIndex = 0, rowLen = rows.length; rowIndex < rowLen; rowIndex++) {
								var row = rows[rowIndex];

								if (row.type === GRID_TYPE_SEPARATOR) {
									continue;
								}

								var views = row.getViewAll();

								var leftmostView = views[0];
								leftmostView._isViewportEventSuppressed = true;
								leftmostView.setScale(newScale.x, newScale.y);
								leftmostView._isViewportEventSuppressed = false;

								var leftmostScrollY = leftmostView.getScrollPosition().y;

								//同じ行の各ビューのスクロールY座標を、一番左のビューに合わせる
								for (var idx = 1, vLen = views.length; idx < vLen; idx++) {
									var view = views[idx];
									view._isViewportEventSuppressed = true;
									view.setScale(newScale.x, newScale.y);
									var vScrPos = view.getScrollPosition();
									view.scrollTo(vScrPos.x, leftmostScrollY);
									view._isViewportEventSuppressed = false;
								}

								this._setRowScrollBarMode(row, row.scrollBarMode);
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
									view._isViewportEventSuppressed = true;
									var vScrPos = view.getScrollPosition();
									view.scrollTo(topmostScrollX, vScrPos.y);
									view._isViewportEventSuppressed = false;
								}

								this._setColumnScrollBarMode(topmostView.columnIndex,
										col.scrollBarMode);
							}

							//TODO forceActive指定があればそのViewをアクティブにする
							var topLeftView = this.getView(0, 0);
							this.setActiveView(topLeftView);

							return;

							/** ************************* */

							function createVScrollBar() {

							}

							if (horizontalSplitDefinitions == null) {
							} else {


								var rxMin = null;
								var rxMax = null;
								if (hDef.scrollRangeX) {
									rxMin = hDef.scrollRangeX.min != null ? hDef.scrollRangeX.min
											: null;
									rxMax = hDef.scrollRangeX.max != null ? hDef.scrollRangeX.max
											: null;
								}
								this.setScrollRangeX(rxMin, rxMax);



							}

							if (verticalSplitDefinitions == null) {
							} else {

								var vDef = verticalSplitDefinitions[0];
								this._t_splitWidth = vDef.width;

								var ryMin = null;
								var ryMax = null;
								if (hDef.scrollRangeX) {
									ryMin = hDef.scrollRangeY.min != null ? hDef.scrollRangeY.min
											: null;
									ryMax = hDef.scrollRangeY.max != null ? hDef.scrollRangeY.max
											: null;
								}

								this.setScrollRangeY(ryMin, ryMax);
							}
						},

						_setRowScrollBarMode: function(row, mode) {
							var rightmostView = row.getView(this.numberOfColumns - 1);

							if (mode === SCROLL_BAR_MODE_ALWAYS) {
								rightmostView.width -= SCROLL_BAR_THICKNESS;
								var $root = $('<div class="h5-stage-scrollbar vertical"></div>');
								row._scrollBarController = this._createVScrollBarController(
										$root[0], row.height, 300);
								$root.css({
									position: 'absolute',
									top: rightmostView.y,
									right: 0,
									cursor: 'default'
								});

								row._scrollBarController.setBarSize(SCROLL_BAR_THICKNESS);
								row._scrollBarController.setScrollSize(1000, 10);

								$root.appendTo(this._stage.rootElement);
							} else {
								if (row._scrollBarController) {
									//noneの場合はスクロールバーを削除する
									row._scrollBarController.dispose();
									$(row._scrollBarController.rootElement).remove();
									row._scrollBarController = null;
								}
							}
						},

						_createVScrollBarController: function(rootElement, height, scrollValue) {
							var controller = h5.core.controller(rootElement,
									h5.ui.components.stage.VerticalScrollBarController);

							controller.readyPromise.done(function() {
								this.setScrollSize(height, scrollValue);
								this.setBarSize(height);
							});

							return controller;
						},

						_setColumnScrollBarMode: function(columnIndex, mode) {
							var col = this.getColumn(columnIndex);

							var bottommostView = col.getView(this.numberOfRows - 1);

							if (mode === SCROLL_BAR_MODE_ALWAYS) {
								bottommostView.height -= SCROLL_BAR_THICKNESS;
								var $root = $('<div class="h5-stage-scrollbar horizontal"></div>');
								col._scrollBarController = this._createHScrollBarController(
										$root[0], col.width, 300);
								$root.css({
									position: 'absolute',
									left: bottommostView.x,
									bottom: 0,
									cursor: 'default'
								});

								col._scrollBarController.setBarSize(SCROLL_BAR_THICKNESS);
								col._scrollBarController.setScrollSize(1000, 10);

								$root.appendTo(this._stage.rootElement);
							} else {
								if (col._scrollBarController) {
									//noneの場合はスクロールバーを削除する
									col._scrollBarController.dispose();
									$(col._scrollBarController.rootElement).remove();
									col._scrollBarController = null;
								}
							}
						},

						_createHScrollBarController: function(rootElement, width, scrollValue) {
							var controller = h5.core.controller(rootElement,
									h5.ui.components.stage.HorizontalScrollBarController);

							controller.readyPromise.done(function() {
								this.setScrollSize(width, scrollValue);
								this.setBarSize(width);
							});

							return controller;
						},

						_onViewportScaleChange: function(event) {
							var srcView = event.target;
							var newScale = srcView.getScale();

							var views = this.getViewAll();
							views.forEach(function(v) {
								if (v !== srcView) {
									v.setScale(newScale.x, newScale.y);
								}
							});
						},

						_onViewportRectChange: function(event) {
							var srcView = event.target;
							var newScrollPos = srcView.getScrollPosition();

							//rowがnullの場合＝ビューがない
							var row = this.getRow(srcView.rowIndex);
							if (row) {
								row.getViewAll().forEach(function(v) {
									v._isViewportEventSuppressed = true;

									if (v !== srcView) {
										//同じ行の他のビューについて、スクロールYの値のみ揃える
										var vScrPos = v.getScrollPosition();
										v.scrollTo(vScrPos.x, newScrollPos.y);
									}

									v._isViewportEventSuppressed = false;
								});
							}

							var col = this.getColumn(srcView.columnIndex);
							if (col) {
								col.getViewAll().forEach(function(v) {
									v._isViewportEventSuppressed = true;

									if (v !== srcView) {
										//同じ行の他のビューについて、スクロールYの値のみ揃える
										var vScrPos = v.getScrollPosition();
										v.scrollTo(newScrollPos.x, vScrPos.y);
									}
									v._isViewportEventSuppressed = false;
								});
							}
						},

						__onSelectDUStart: function(dragStartPos) {
							this.getViewAll().forEach(function(v) {
								v.__onSelectDUStart(dragStartPos);
							});
						},

						__onSelectDUMove: function(worldPos, worldWidth, worldHeight) {
							this.getViewAll().forEach(function(v) {
								v.__onSelectDUMove(worldPos, worldWidth, worldHeight);
							});
						},

						__onSelectDUEnd: function() {
							this.getViewAll().forEach(function(v) {
								v.__onSelectDUEnd();
							});
						},

						__onDragDUStart: function(dragSession) {
							var targetDUs = dragSession.getTarget();
							if (!Array.isArray(targetDUs)) {
								targetDUs = [targetDUs];
							}

							this._draggingTargetDUVisibleMap = new Map();

							var that = this;
							targetDUs.forEach(function(du) {
								//強制的に元のDUをisVisible = falseにするため
								//元のisVisibleを覚えておく
								//TODO isVisibleを内部的なものにした方が良い
								that._draggingTargetDUVisibleMap.set(du, du.isVisible);

								//レイヤーに存在する元々のDUは非表示にする
								du.isVisible = false;
							});

							//各ビューのドラッグスタート処理を呼ぶ
							this.getViewAll().forEach(function(v) {
								v.__onDragDUStart(dragSession);
							});
						},

						__onDragDUMove: function(dragSession) {
							this.getViewAll().forEach(function(v) {
								v.__onDragDUMove(dragSession);
							});
						},

						__onDragDUDrop: function(dragSession) {
							this.getViewAll().forEach(function(v) {
								v.__onDragDUDrop(dragSession);
							});

							//DUの元のVisibleの状態を復元
							this._draggingTargetDUVisibleMap.forEach(function(isVisible, du) {
								du.isVisible = isVisible;
							});
						}
					}
				};
				return desc;
			});

	var EVENT_SIGHT_CHANGE = 'stageSightChange';

	var BasicDisplayUnit = h5.cls.manager.getClass('h5.ui.components.stage.BasicDisplayUnit');
	var Edge = h5.cls.manager.getClass('h5.ui.components.stage.Edge');

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

	var DRAG_MODE_NONE = stageModule.DragMode.NONE;
	var DRAG_MODE_AUTO = stageModule.DragMode.AUTO;
	var DRAG_MODE_SCREEN = stageModule.DragMode.SCREEN;
	var DRAG_MODE_DU = stageModule.DragMode.DU;
	var DRAG_MODE_SELECT = stageModule.DragMode.SELECT;
	var DRAG_MODE_REGION = stageModule.DragMode.REGION;

	var SCROLL_DIRECTION_NONE = stageModule.ScrollDirection.NONE;
	var SCROLL_DIRECTION_X = stageModule.ScrollDirection.X;
	var SCROLL_DIRECTION_Y = stageModule.ScrollDirection.Y;
	var SCROLL_DIRECTION_XY = stageModule.ScrollDirection.XY;

	var BOUNDARY_SCROLL_INTERVAL = 20;
	var BOUNDARY_SCROLL_INCREMENT = 10;

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
	var EVENT_VIEW_SIZE_CHANGE = 'stageViewSizeChange';

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

	var LAYER_ID_FOREMOST = '_foremost_layer_';

	var PROXY_DEFAULT_CURSOR_OFFSET = 3;

	var StageUtil = h5.ui.components.stage.StageUtil;

	var stageController = {
		/**
		 * @memberOf h5.ui.components.stage.StageController
		 */
		__name: 'h5.ui.components.stage.StageController',

		_layers: null,

		_units: null,

		_viewport: null,

		_initData: null,

		_defs: null,

		UIDragScreenScrollDirection: SCROLL_DIRECTION_XY,

		isWheelScrollDirectionReversed: false,

		isWheelScaleDirectionReversed: false,

		//(UI操作によるかどうかは関係なく)スクロールする範囲を配列で指定。
		//{ min: , max: } をディスプレイ座標で指定。

		//TODO dependsOn()
		_selectionLogic: h5.ui.SelectionLogic,

		_focusController: h5.ui.FocusController,

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
			var ww = this._getActiveView()._viewport.getXLengthOfWorld(displayWidth);
			var wh = this._getActiveView()._viewport.getYLengthOfWorld(displayHeight);

			//ワールド座標系のRectに直す
			var wRect = stageModule.Rect.create(wtl.x, wtl.y, ww, wh);

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
				var duGlobalRect = stageModule.Rect.create(worldGlobalPos.x, worldGlobalPos.y,
						du.width, du.height);
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

		__construct: function() {
			this._units = new Map();
			this._layers = [];
			this.UIDragMode = DRAG_MODE_AUTO;

			this._stageViewCollection = GridStageViewCollection.create(this);
		},

		__ready: function() {
			//overflow: hiddenは各StageView側で設定
			$(this.rootElement).css({
				position: 'absolute'
			});

			this.refresh(true);
		},

		'{this._selectionLogic} selectionChange': function(context) {
			var ev = context.event;

			//今回新たに選択されたDUの選択フラグをONにする
			var selected = ev.changes.selected;
			for (var i = 0, len = selected.length; i < len; i++) {
				var newSelectedDU = selected[i];
				newSelectedDU._isSelected = true;
				newSelectedDU.requestRender();
			}

			//今回非選択状態になったDUの選択フラグをOFFにする
			var unselected = ev.changes.unselected;
			for (var i = 0, len = unselected.length; i < len; i++) {
				var unselectedDU = unselected[i];
				unselectedDU._isSelected = false;
				unselectedDU.requestRender();
			}

			var focused = ev.focused;
			if (focused) {
				focused._isFocused = true;
				this._focusController.setFocusedElement(focused._domRoot);
				focused.requestRender();
			}

			var unfocusedDU = ev.changes.unfocused;
			if (unfocusedDU) {
				unfocusedDU._isFocused = false;
				unfocusedDU.requestRender();
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

			//duClickイベントは、DUがselectableかどうかに関係なく発生させる
			var evArg = {
				stageController: this,
				displayUnit: du
			};
			var bizEvent = $.event.fix(event.originalEvent);
			bizEvent.type = triggerEventName;
			bizEvent.target = event.target; //null; //du._domRoot; //TODO 仮想化対応
			bizEvent.currentTarget = event.target; // du._domRoot;

			//TODO クリックされたDUの実DOMからイベントをあげるのが元々の仕様。ただし、分割が入ったのでDOM依存はよくないかも？
			$(event.target).trigger(bizEvent, evArg);

			if (!du.isSelectable || bizEvent.isDefaultPrevented()) {
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

		_currentDragMode: DRAG_MODE_NONE,

		_dragSelectStartPos: null,

		_dragSelectStartSelectedDU: null,

		_dragLastPagePos: null,

		_dragSession: null,

		_dragStartRootOffset: null, //ドラッグ中のみ使用する、rootElementのoffset()値

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

				this._dragSelectOverlayRect = stageModule.SvgUtil.createElement('rect');
				this._dragSelectOverlayRect.className.baseVal = ('stageDragSelectRangeOverlay');
				stageModule.SvgUtil.setAttributes(this._dragSelectOverlayRect, {
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

				this._dragSelectOverlayRect = stageModule.SvgUtil.createElement('rect');
				this._dragSelectOverlayRect.className.baseVal = ('stageDragRegionOverlay');
				stageModule.SvgUtil.setAttributes(this._dragSelectOverlayRect, {
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

					this._stageViewCollection.__onDragDUStart(this._dragSession);

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

						this._stageViewCollection.__onSelectDUStart(this._dragSelectStartPos);
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

		_isMousedown: false,

		'{rootElement} mousedown': function(context, $el) {
			this._isMousedown = true;
			this._isDraggingStarted = false;

			var event = context.event;

			var view = this._getActiveViewFromElement(event.target);
			if (view) {
				this._stageViewCollection.setActiveView(view);
			}

			if ($(event.target).hasClass('stageGridSeparator')) {
				//ドラッグ対象がグリッドセパレータの場合は
				//グリッドのサイズ変更とみなす
				this._startGridSeparatorDrag(context);
			}

			this._dragLastPagePos = {
				x: event.pageX,
				y: event.pageY
			};

			//TODO 初回のmousemoveのタイミングで
			//動作対象を決めると、DUの端の方にカーソルがあったときに
			//mousedown時にはDUの上にカーソルがあったのに
			//moveのときに離れてしまい、スクリーンドラッグと判定されるなど
			//挙動が一貫しない可能性がある。
			//そのため、ドラッグモードについては
			//mousedownのタイミングで決定しつつ、
			//実際にdragStartとみなす（イベントを発生させる）のは
			//moveのタイミングにするのがよい。
			event.preventDefault();
		},

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
				toggleBoundaryScroll.call(this, function(dispScrX, dispScrY) {
					that._dragSession.doPseudoMoveBy(dispScrX, dispScrY);
				});

				var dragOverDU = this._getDragOverDisplayUnit(context.event);

				delegatedJQueryEvent.type = EVENT_DRAG_DU_MOVE;
				delegatedJQueryEvent.target = this.rootElement;
				delegatedJQueryEvent.currentTarget = this.rootElement;

				this.trigger(delegatedJQueryEvent, {
					dragSession: this._dragSession,
					dragOverDisplayUnit: dragOverDU
				});

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

				//doMoveの中でStageViewCollection.__onDragDUMoveが呼ばれる
				this._dragSession.doMove(context.event);
				break;
			case DRAG_MODE_REGION:
				toggleBoundaryScroll.call(this, function() {
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
				toggleBoundaryScroll.call(this, function() {
					var dragSelectedDU = dragSelect.call(that);
					var tempSelection = that._dragSelectStartSelectedDU.concat(dragSelectedDU);
					that.select(tempSelection, true);
				});

				var dragSelectedDU = dragSelect.call(this);
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

			function dragSelect() {
				var pos = this._getCurrentDragPosition();

				//ドラッグ範囲を示す半透明のオーバーレイのサイズを更新
				this._updateDragOverlay(pos.dispActualX, pos.dispActualY, pos.dispW, pos.dispH);

				//TODO isSelectableがfalseなものを除く
				return this.getDisplayUnitsInRect(pos.dispActualX, pos.dispActualY, pos.dispW,
						pos.dispH, true);
			}

			function toggleBoundaryScroll(callback) {
				var activeView = this._getActiveView();

				var pointerX = this._dragLastPagePos.x - this._dragStartRootOffset.left
						- activeView.x;
				var pointerY = this._dragLastPagePos.y - this._dragStartRootOffset.top
						- activeView.y;

				var nineSlice = activeView._viewport.getNineSlicePosition(pointerX, pointerY);
				if (nineSlice.x !== 0 || nineSlice.y !== 0) {
					this._beginBoundaryScroll(nineSlice, callback);
				} else {
					this._endBoundaryScroll();
				}
			}
		},

		_updateDragOverlay: function(dispActualX, dispActualY, dispW, dispH) {
			var activeView = this._getActiveView();

			var worldPos = activeView._viewport.getWorldPosition(dispActualX, dispActualY);
			var ww = activeView._viewport.getXLengthOfWorld(dispW);
			var wh = activeView._viewport.getYLengthOfWorld(dispH);

			this._stageViewCollection.__onSelectDUMove(worldPos, ww, wh);
		},

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
			// （同期、非同期に関わらず）マウスを離した瞬間にすべき終了処理
			this._isMousedown = false;

			if (this._isGridSeparatorDragging) {
				//グリッドセパレータのドラッグの場合は
				//処理を委譲して終了
				this._endGridSeparatorDrag(context);
				return;
			}

			this._endBoundaryScroll();

			this._stageViewCollection.__onSelectDUEnd();

			if (this._currentDragMode === DRAG_MODE_NONE) {
				return;
			}

			if (this._currentDragMode === DRAG_MODE_SELECT) {
				this.trigger(EVENT_DRAG_SELECT_END, {
					stageController: this
				});
			}

			if (this._currentDragMode === DRAG_MODE_REGION) {
				var lastDragPos = this._getCurrentDragPosition();

				var worldPos = this._getActiveView()._viewport.getWorldPosition(
						lastDragPos.dispActualX, lastDragPos.dispActualY);
				var ww = this._getActiveView()._viewport.getXLengthOfWorld(lastDragPos.dispW);
				var wh = this._getActiveView()._viewport.getYLengthOfWorld(lastDragPos.dispH);

				var dispRect = stageModule.Rect.create(lastDragPos.dispActualX,
						lastDragPos.dispActualY, lastDragPos.dispW, lastDragPos.dispH);
				var worldRect = stageModule.Rect.create(worldPos.x, worldPos.y, ww, wh);

				this.trigger(EVENT_DRAG_REGION_END, {
					stageController: this,
					displayRect: dispRect,
					worldRect: worldRect
				});
			}

			if (this._currentDragMode === DRAG_MODE_DU) {
				var dragOverDU = this._getDragOverDisplayUnit(context.event);

				var delegatedJQueryEvent = $.event.fix(context.event.originalEvent);
				delegatedJQueryEvent.type = EVENT_DRAG_DU_DROP;
				delegatedJQueryEvent.target = this.rootElement;
				delegatedJQueryEvent.currentTarget = this.rootElement;

				this._stageViewCollection.__onDragDUDrop(this._dragSession);

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
		},

		_disposeDragSession: function() {
			this._isMousedown = false;
			this._dragStartRootOffset = null;

			this._dragSession.removeEventListener('dragSessionEnd',
					this._dragSessionEndHandlerWrapper);
			this._dragSession.removeEventListener('dragSessionCancel',
					this._dragSessionCancelHandlerWrapper);

			this._dragSession = null; //TODO dragSessionをdisposeする
			// this._currentDragMode = DRAG_MODE_NONE;
			this._currentDragMode = DRAG_MODE_NONE;
			this._dragSelectStartPos = null;
			this._dragSelectStartSelectedDU = null;
			//			this._dragStartPagePos = null;
			this._dragLastPagePos = null;
			$(this.rootElement).css('cursor', 'auto');
		},


		_getDragOverDisplayUnit: function(event) {
			//ドラッグ中、ドラッグ対象のDUはpointer-events=noneの
			//隠し最前面レイヤーに移動している。
			//そのため、イベントはその他のレイヤーにあるDUから発生する。
			//つまり、event.targetを含むDUは、ドラッグオーバーしているDUになる。
			var dragOverDU = this._getIncludingDisplayUnit(event.target);
			return dragOverDU;
		},

		_isDraggingStarted: false,

		_boundaryScrollTimerId: null,

		_nineSlice: null,

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

		_endBoundaryScroll: function() {
			if (this._boundaryScrollTimerId) {
				clearInterval(this._boundaryScrollTimerId);
				this._boundaryScrollTimerId = null;
				this._nineSlice = null;
			}
		},

		_updateRootSize: function(width, height) {
			//TODO 仮実装。Viewの分割に対応。
			//			if (this._t_splitHeight != null) {
			//				height = this._t_splitHeight;
			//			}
			//			if (this._t_splitWidth != null) {
			//				width = this._t_splitWidth;
			//			}

			var w = width !== undefined ? width : $(this.rootElement).width();
			var h = height !== undefined ? height : $(this.rootElement).height();

			//一番下・右のビューに対して差分を与える

			//			var views = this._stageViewCollection.getViewAll();
			//			var len = views.length;
			//			for (var i = 0; i < len; i++) {
			//				var view = views[i];
			//
			//				view.width = w;
			//				view.height = h;
			//				//TODO viewportの値はStageView側で更新すべき
			//				view._viewport.setDisplaySize(w, h);
			//			}
		},

		setup: function(initData) {
			//TODO setup()が__readyより前などいつ呼ばれても正しく動作するようにする

			this._initData = initData;

			if (initData.layers) {
				for (var i = 0, len = initData.layers.length; i < len; i++) {
					var layerDef = initData.layers[i];
					var layer = Layer.create(layerDef.id, this);
					this.addLayer(layer, null, layerDef.isDefault);
				}
			}

			//初期状態では分割のない表示を行う
			this._resetGridView(null, null);

			this._updateRootSize();
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

		_defaultLayer: null,

		addLayer: function(layer, index, isDefault) {
			if (this._layers.length === 0 || isDefault === true) {
				this._defaultLayer = layer;
			}

			if (index != null) {
				this._layers.splice(index, 0, layer);
			} else {
				this._layers.push(layer);
			}
			layer._onAddedToRoot(this);
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
		 * @param displayOffsetX 拡縮時の中心点のx（ディスプレイ座標系におけるoffsetX(stageのルート要素の左上を基準とした座標)）
		 * @param displayOffsetY 拡縮時の中心点のy（仕様はxと同じ）
		 */
		setScale: function(scaleX, scaleY, displayOffsetX, displayOffsetY) {
			return this._getActiveView().setScale(scaleX, scaleY, displayOffsetX, displayOffsetY);
		},

		_getActiveView: function() {
			return this._stageViewCollection.getActiveView();
		},

		_getActiveViewFromElement: function(element) {
			var views = this._stageViewCollection.getViewAll();
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

		refresh: function(immediate) {
			this._updateRootSize();
		},

		getScrollPosition: function() {
			return this._getActiveView().getScrollPosition();
		},

		_lastEnteredDU: null,

		_dragSessionEndHandlerWrapper: null,

		_dragSessionEndHandler: function() {
			this.trigger(EVENT_DRAG_DU_END);
			this._disposeDragSession();
		},

		_dragSessionCancelHandlerWrapper: null,

		_dragSessionCancelHandler: function() {
			this.trigger(EVENT_DRAG_DU_CANCEL);
			this._disposeDragSession();
		},

		'{rootElement} click': function(context) {
			this._processClick(context.event, EVENT_DU_CLICK);
		},

		'{rootElement} dblclick': function(context) {
			this._processClick(context.event, EVENT_DU_DBLCLICK);
		},

		'{rootElement} contextmenu': function(context) {
			var du = this._getIncludingDisplayUnit(context.event.target);

			// TODO: Edgeの選択が実装されておらず例外が発生するため、一時的に別関数で処理することでこれを回避
			if (Edge.isClassOf(du)) {
				this._temporarilyProcessEdgeContextmenu(context, du);
				return;
			}

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

			if (!du.isSelected) {
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

		/*
		 * TODO: Edgeの選択が実装されておらず例外が発生するため、一時的に別関数で処理することでこれを回避
		 */
		_temporarilyProcessEdgeContextmenu: function(context, du) {
			var orgEvent = context.event.originalEvent;
			var fixedEvent = $.event.fix(orgEvent);
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

		'{rootElement} wheel': function(context, $el) {
			var event = context.event;
			var wheelEvent = event.originalEvent;

			var view = this._getActiveViewFromElement(event.target);
			if (view) {
				this._stageViewCollection.setActiveView(view);
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

			// TODO どの操作でどうするかは要検討
			if (event.shiftKey) {
				// シフトキーが押されていたら拡大縮小
				if (this.isWheelScaleDirectionReversed) {
					wheelDirection *= -1;
				}

				var ds = -0.1 * wheelDirection;

				var activeView = this._getActiveView();

				var rootOffset = $(this.rootElement).offset();
				var offsetX = wheelEvent.pageX - rootOffset.left - activeView.x;
				var offsetY = wheelEvent.pageY - rootOffset.top - activeView.y;

				this.setScale(this._getActiveView()._viewport.scaleX + ds,
						this._getActiveView()._viewport.scaleY + ds, offsetX, offsetY);
				return;
			}

			//ステージをスクロールする
			if (this.isWheelScrollDirectionReversed) {
				wheelDirection *= -1;
			}
			var dy = 40 * wheelDirection;

			this.scrollBy(0, dy);
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

		_processKeyEvent: function(event, eventName) {
			if (this._isInputTag(event.target)) {
				return;
			}

			var du = this._getIncludingDisplayUnit(event.target);

			if (!du || du !== this.getFocusedDisplayUnit()) {
				//DUがない（＝ステージをクリックした後キー入力した、等）または
				//現在Stageとしてフォーカスが当たっている要素以外からのキーイベントの場合は何もしない
				return;
			}

			//TODO domRootがスクロールしても消えないことを保証する
			//TODO DOMからDUのルートを取れるようにする
			var eventSource = event.target; //du._domRoot;

			var ev = $.event.fix(event.originalEvent);
			ev.type = eventName;
			ev.target = eventSource;
			ev.currentTarget = eventSource;

			$(eventSource).trigger(ev, {
				displayUnit: du
			});
		},

		_isInputTag: function(element) {
			var tag = element.tagName.toLowerCase();
			if (tag === 'input' || tag === 'textarea' || tag === 'select') {
				return true;
			}
			return false;
		},

		setScrollRangeX: function(minDisplayX, maxDisplayX) {
			return this._getActiveView().setScrollRangeX(minDisplayX, maxDisplayX);
		},

		setScrollRangeY: function(minDisplayY, maxDisplayY) {
			return this._getActiveView().setScrollRangeY(minDisplayY, maxDisplayY);
		},

		_stageViewCollection: null,

		getViewCollection: function() {
			return this._stageViewCollection;
		},

		splitView: function(horizontalSplitDefinitions, verticalSplitDefinitions) {
			this._resetGridView(horizontalSplitDefinitions, verticalSplitDefinitions);

			var evArg = this._createViewStructureChangeEventArg();
			this.trigger(EVENT_VIEW_STRUCTURE_CHANGE, evArg);

			this.refresh(true);
		},

		_resetGridView: function(horizontalSplitDefinitions, verticalSplitDefinitions) {
			var w = $(this.rootElement).width();
			var h = $(this.rootElement).height();

			this._stageViewCollection._makeGrid(horizontalSplitDefinitions,
					verticalSplitDefinitions, w, h);
		},

		_createViewStructureChangeEventArg: function() {
			//TODO 変更前の値のオブジェクトを作る
			return {};
		},

		_t_splitWidth: null,
		_t_splitHeight: null,

		_isGridSeparatorDragging: false,

		_gridSeparatorDragInfo: null,

		_startGridSeparatorDrag: function(context) {
			var $el = $(context.event.target);

			var index = parseInt($el.data('stageDynSepIdx'));
			var isHorizontal = $el.hasClass('horizontal');

			var sep;

			//TODO StageViewCollection側にseparatorをIndex指定で取得するAPIを作るべき
			if (isHorizontal) {
				var allRows = this._stageViewCollection.getRowsOfAllTypes();
				sep = allRows[index];
			} else {
				var allCols = this._stageViewCollection.getColumnsOfAllTypes();
				sep = allCols[index];
			}

			this._gridSeparatorDragInfo = {
				$target: $el,
				index: index,
				isHorizontal: isHorizontal,
				separator: sep
			};
			this._isGridSeparatorDragging = true;
		},

		_processGridSeparatorDragMove: function(context) {
			var event = context.event;

			var dispDx = event.pageX - this._dragLastPagePos.x;
			var dispDy = event.pageY - this._dragLastPagePos.y;

			this._dragLastPagePos = {
				x: event.pageX,
				y: event.pageY
			};

			var info = this._gridSeparatorDragInfo;

			if (info.isHorizontal) {
				//水平分割(上下に分割)しているので、横方向には動かさない
				dispDx = 0;
			} else {
				dispDy = 0;
			}

			if (dispDx === 0 && dispDy === 0) {
				//X,Yどちらの方向にも実質的に動きがない場合は何もしない
				return;
			}

			if (info.isHorizontal) {
				var currTop = info.$target.position().top;
				var newTop = currTop + dispDy;

				//TODO マウスが突き抜けた場合にずれないようにする必要がある
				if (newTop < 0) {
					newTop = 0;
				}

				info.$target.css({
					top: newTop
				});

				//自分（セパレータ）の上下のRowの高さと位置を変更
				var allRows = this._stageViewCollection.getRowsOfAllTypes();

				var aboveRow = allRows[info.index - 1];
				var belowRow = allRows[info.index + 1];

				aboveRow.getViewAll().forEach(function(view) {
					view.height += dispDy;
				});

				belowRow.getViewAll().forEach(function(view) {
					view.y = newTop + info.separator.height;
					view.height -= dispDy;
				});

			} else {
				var currLeft = info.$target.position().left;
				var newLeft = currLeft + dispDx;

				//TODO マウスが突き抜けた場合にずれないようにする必要がある
				if (newLeft < 0) {
					newLeft = 0;
				}

				info.$target.css({
					left: newLeft
				});

				var allCols = this._stageViewCollection.getColumnsOfAllTypes();

				var leftCol = allCols[info.index - 1];
				var rightCol = allCols[info.index + 1];

				leftCol.getViewAll().forEach(function(view) {
					view.width += dispDx;
				});

				rightCol.getViewAll().forEach(function(view) {
					view.x = newLeft + info.separator.width;
					view.width -= dispDx;
				});
			}

			this._isDraggingStarted = true;

			var evArg = {
				isLive: true
			//				rowIndices: [0, 2],
			//				columnIndices: null,
			//
			//				rowSeparatorIndices: null,
			//				columnSeparatorIndices: null,
			};
			this.trigger(EVENT_VIEW_SIZE_CHANGE, evArg);
		},

		_endGridSeparatorDrag: function(context, $el) {
			this._isGridSeparatorDragging = false;
			this._gridSeparatorDragInfo = null;

			var evArg = {
				isLive: false
			};
			this.trigger(EVENT_VIEW_SIZE_CHANGE, evArg);
		}
	};


	h5.core.expose(stageController);

})(jQuery);
