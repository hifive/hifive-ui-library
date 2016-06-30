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
(function($) {
	'use strict';

	var RootClass = h5.cls.RootClass;


	//クラスとして作ったものを変える
	//	RootClass.extend(function() {
	//		var desc = {
	//			name: 'h5.ui.components.stage.DragSessionController',
	//			method: {
	//				constructor: function DragSessionController() {
	//					DragSessionController._super.call(this);
	//				}
	//			}
	//		};
	//		return desc;
	//	});


	/**
	 * DragSession
	 * <p>
	 * 図形(Shapeクラス)のドラッグ操作を行うためのクラスです。コンストラクタで渡された図形についてのドラッグ操作を管理します。
	 * </p>
	 *
	 * @class
	 * @name DragSession
	 * @returns クラス定義
	 */
	RootClass.extend(function() {
		// TODO 1つのShapeについて1つのDragSessionしか同時に実行できないように
		// staticなマップで管理する

		var DRAG_MODE_SELF = 'self';


		var desc = {
			name: 'h5.ui.components.stage.DragSession',
			field: {
				/**
				 * ドラッグ操作対象オブジェクト
				 */
				_target: null,
				_startX: null,
				_startY: null,
				_moveX: null,
				_moveY: null,
				_isCompleted: null,
				_dragMode: null,
				_controller: null,
				_dragCallbacks: null
			},
			property: {
				isCompleted: {
					get: function() {
						return this._isCompleted;
					}
				}
			},
			method: {
				constructor: function DragSession(target, dragMode) {
					DragSession._super.call(this);

					this._isCompleted = false;

					this._dragCallbacks = [];

					//this._target = target;

					//TODO byProxyか、オブジェクトをそのまま動かすかをdragModeで指定できるようにする
					// proxy, selfのどちらか
					//this._dragMode = DRAG_MODE_SELF; //dragMode;

					//DOMならtop, left, SVGならx,yかtranslateか
					//DUの場合はx,y
					//this._startX = target.x;
					//this._startY = target.y;

					this._moveDx = 0;
					this._moveDy = 0;

					this._moveX = 0;
					this._moveY = 0;
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
				moveTo: function(x, y) {

					var dxTotal = x - this._moveX;
					var dyTotal = y - this._moveY;

					//					this._

					this._moveX = x;
					this._moveY = y;

				},

				moveBy: function(dx, dy) {
					var x = this._moveX + dx;
					var y = this._moveY + dy;
					this.moveTo(x, y);
				},

				/**
				 * ドラッグセッションを終了して位置を確定させる
				 * <p>
				 * moveメソッドを使って移動させた位置で、図形の位置を確定します。
				 * </p>
				 *
				 * @memberOf DragSession
				 * @instance
				 * @returns {DragSession}
				 */
				complete: function() {
					if (this._isCompleted) {
						return;
					}
					this._isCompleted = true;

					this._controller.dispose();
				},

				/**
				 * ドラッグセッションを終了して位置を元に戻す
				 * <p>
				 * moveメソッドで移動させた処理を元に戻します。
				 * </p>
				 *
				 * @memberOf DragSession
				 * @instance
				 * @returns {DragSession}
				 */
				cancel: function() {
					if (this._isCompleted) {
						return;
					}
					this._isCompleted = true;

					if (this._dragMode === DRAG_MODE_SELF) {
						this._target.moveTo(this._startX, this._startY);
					}

					this._controller.dispose();
				},

				addDragCallback: function(func) {
					this._dragCallbacks.push(func);
				},

				_onMove: function(dx, dy) {
					var callbacks = this._dragCallbacks;
					for (var i = 0, len = callbacks.length; i < len; i++) {
						var f = callbacks[i];
						f(this, dx, dy);
					}
				}
			}
		};
		return desc;
	});


	var DragSession = h5.cls.manager.getClass('h5.ui.components.stage.DragSession');

	var dragController = {
		/**
		 * @memberOf h5.ui.components.stage.DragController
		 */
		__name: 'h5.ui.components.stage.DragController',

		_dragSession: null,

		getDragSession: function() {
			return this._dragSession;
		},

		'{rootElement} h5trackstart': function(context) {
			this._dragSession = DragSession.create();
			//TODO DragStartイベントの出し方
			this.trigger('dgDragStart', {
				dragSession: this._dragSession
			});
		},

		'{rootElement} h5trackmove': function(context) {
			if (!this._dragSession || this._dragSession.isCompleted) {
				return;
			}

			var ev = context.event;
			var dx = ev.dx;
			var dy = ev.dy;
			this._dragSession._onMove(dx, dy);
		},

		'{rootElement} h5trackend': function(context) {
			if (!this._dragSession || this._dragSession.isCompleted) {
				return;
			}

			var ds = this._dragSession;

			ds.complete();

			this._dragSession = null;

			//TODO dragSessionを渡すべきか？
			this.trigger('dgDragEnd', {
				dragSession: ds
			});
		}
	};

	h5.core.expose(dragController);

	var dragSessionController = {
		/**
		 * @memberOf h5.ui.components.stage.DragSessionController_TOBEDELETED
		 */
		__name: 'h5.ui.components.stage.DragSessionController',

		_dragSession: null,

		setDragSession: function(dragSession) {
			this._dragSession = dragSession;
		},

		'{rootElement} h5trackstart': function(context) {
		//ignore
		},

		'{rootElement} h5trackmove': function(context) {
			var ev = context.event;
			var dx = ev.dx;
			var dy = ev.dy;
			this._dragSession._onMove(dx, dy);
		},

		'{rootElement} h5trackend': function(context) {
			this._dragSession.complete();
		}
	};


	var Rect = RootClass.extend(function() {
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
					Rect._super.call(this);
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
				}
			}
		};
		return desc;
	});


	var Point = RootClass.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.Point',
			field: {
				x: null,
				y: null
			},
			method: {
				constructor: function Point(x, y) {
					Point._super.call(this);
					this.x = x;
					this.y = y;
				}
			}
		};
		return desc;
	});

	var WorldPoint = Point.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.WorldPoint',
			method: {
				constructor: function WorldPoint(x, y) {
					WorldPoint._super.call(this, x, y);
				}
			}
		};
		return desc;
	});

	var DisplayPoint = Point.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.DisplayPoint',
			method: {
				constructor: function DisplayPoint(x, y) {
					DisplayPoint._super.call(this, x, y);
				}
			}
		};
		return desc;
	});

	function createSvgElement(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	function isHifiveClass(target) {
		return target && typeof target.getFullName === 'function'
				&& typeof target.getParentClass === 'function';
	}

	function setSvgAttribute(element, key, value) {
		// SVGGradientを考慮
		if (value && typeof value.getClass === 'function') {
			var clss = value.getClass();
			var gradient = false;

			while (isHifiveClass(clss)) {
				var name = clss.getFullName();
				if (name === 'h5.ui.components.stage.SVGGradient') {
					gradient = true;
					break;
				}

				clss = clss.getParentClass();
			}

			if (gradient) {
				var id = value.id;
				element.setAttributeNS(null, key, 'url(#' + id + ')');
				return;
			}
		}
		element.setAttributeNS(null, key, value);
	}

	function setSvgAttributes(element, param) {
		for ( var key in param) {
			element.setAttributeNS(null, key, param[key]);
		}
	}

	function removeSvgAttribute(element, key) {
		element.removeAttributeNS(null, key);
	}

	function removeSvgAttributes(element, keys) {
		for (var i = 0; i < keys.length; i++) {
			removeSvgAttribute(element, key[i]);
		}
	}

	var SVGElementWrapper = RootClass.extend(function() {
		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGElementWrapper
			 */
			name: 'h5.ui.components.stage.SVGElementWrapper',
			field: {
				_element: null
			},
			method: {
				constructor: function SVGElementWrapper() {
					SVGElementWrapper._super.call(this);
				}
			}
		};
		return desc;
	});

	//TODO 本当はSVGDrawElementのfuncの中に入れたいが
	//Eclipseのフォーマッタと相性が悪い。いずれ方法を検討。
	var ERR_MUST_OVERRIDE_RENDER_FUNCTION = 'SVGDrawElementのrenderメソッドは、その子クラスで必ずオーバーライドする必要があります。';

	var SVGDrawElement = SVGElementWrapper.extend(function() {

		function getChangedAttributes() {
			return {
				changed: [],
				removed: [],
				addChanged: function(name) {
					if (this.changed.indexOf(name) === -1) {
						this.changed.push(name);
					}
					var index;
					if ((index = this.removed.indexOf(name)) !== -1) {
						this.removed.splice(index, 1);
					}
				},
				addRemoved: function(name) {
					if (this.removed.indexOf(name) === -1) {
						this.removed.push(name);
					}
					var index;
					if ((index = this.changed.indexOf(name)) !== -1) {
						this.changed.splice(index, 1);
					}
				},
				removeEntry: function(name) {
					var index;
					if ((index = this.changed.indexOf(name)) !== -1) {
						this.changed.splice(index, 1);
					}
					if ((index = this.removed.indexOf(name)) !== -1) {
						this.removed.splice(index, 1);
					}
				}
			};
		}

		var desc = {
			name: 'h5.ui.components.stage.SVGDrawElement',
			field: {
				_classes: null,
				_attributes: null,
				_graphics: null,
				_changedAttributes: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGDrawElement
				 */
				constructor: function SVGDrawElement(graphics, element) {
					SVGDrawElement._super.call(this);
					this._graphics = graphics;
					this._element = element;
					this._classes = [];
					this._attributes = new Map();
					this._changedAttributes = getChangedAttributes();
				},
				getAttribute: function(key) {
					return this._attributes.has(key) ? this._attributes.get(key) : null;
				},
				setAttribute: function(key, value, sync) {
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
						setSvgAttribute(this._element, key, value);
					} else {
						this._changedAttributes.addChanged(key);
						this.requestRender();
					}
				},
				setAttributes: function(param, sync) {
					for ( var key in param) {
						if (param.hasOwnProperty(key)) {
							this.setAttribute(key, param[key], sync);
						}
					}
				},
				removeAttribute: function(key, sync) {
					// FIXME deleteがエラーとして表示される
					if (!this._attributes.has(key)) {
						return;
					}

					this._attributes['delete'](key);
					if (sync) {
						this._changedAttributes.removeEntry(key);
						removeSvgAttribute(this._element, key);
					} else {
						this._changedAttributes.addRemoved(key);
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
				requestRender: function() {
					if (this._graphics) {
						this._graphics._addToRenderWaitingList(this);
					}
				},
				render: function() {
					throw new Error(ERR_MUST_OVERRIDE_RENDER_FUNCTION);
				},
				_renderChangedAttributes: function() {
					// Delete removed attributes
					var attrChanged = false;
					var removed = this._changedAttributes.removed;
					if (removed) {
						removeSvgAttributes(this._element, removed);
						removed.splice(0, removed.length);
						attrChanged = true;
					}

					var changed = this._changedAttributes.changed;
					if (changed) {
						for (var i = 0; i < changed.length; i++) {
							var key = changed[i];
							setSvgAttribute(this._element, key, this._attributes.get(key));
						}
						changed.splice(0, changed.length);
						attrChanged = true;
					}

					return attrChanged;
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
				}
			})(attrName);
		}
	}

	var SVGLine = SVGDrawElement.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGLine',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGLine
				 */
				constructor: function SVGLine(graphics, element) {
					SVGLine._super.call(this, graphics, element);
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

	var SVGText = SVGDrawElement.extend(function() {
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
					SVGText._super.call(this, graphics, element);
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

					this.setAttribute('transform', 'translate(0, ' + dy + ')', true);
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

	var SVGRect = SVGDrawElement.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGRect',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGRect
				 */
				constructor: function SVGRect(graphics, element) {
					SVGRect._super.call(this, graphics, element);
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

	var SVGCircle = SVGDrawElement.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.SVGCircle',
			accessor: {},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.SVGCircle
				 */
				constructor: function SVGCircle(graphics, element) {
					SVGCircle._super.call(this, graphics, element);
				},
				render: function() {
					this._renderChangedAttributes();
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['cx', 'cy', 'r', 'stroke', 'stroke-width', 'fill']);
		return desc;
	});

	var SVGTriangle = SVGDrawElement.extend(function() {
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
				constructor: function SVGTriangle(graphics, element) {
					SVGTriangle._super.call(this, graphics, element);
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

					this.setAttribute('d', path, true);
				}
			}
		};

		addSimpleSVGAccessor(desc.accessor, ['stroke', 'stroke-width', 'fill']);
		return desc;
	});

	var SVGDefinitions = SVGElementWrapper.extend(function() {
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
				constructor: function SVGDefinitions(element) {
					SVGDefinitions._super.call(this);
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

	function addSimpleGradientAccessor(target, attrNames) {
		for (var i = 0; i < attrNames.length; i++) {
			var attrName = attrNames[i];
			var name = attrName.replace(/-(.)/g, function(match) {
				return match.charAt(1).toUpperCase();
			});

			target[name] = (function(attrName) {
				return {
					get: function() {
						return this._getAttribute(attrName);
					},
					set: function(value) {
						this._setAttribute(attrName, value);
					}
				}
			})(attrName);
		}
	}

	var SVGGradient = SVGElementWrapper.extend(function() {
		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGGradient
			 */
			name: 'h5.ui.components.stage.SVGGradient',
			field: {
				_attributes: null,
				_stops: null
			},
			accessor: {
				id: {
					get: function() {
						return this._getAttribute('id');
					}
				}
			},
			method: {
				constructor: function SVGGradient(element, id) {
					SVGGradient._super.call(this);
					this._element = element;
					this._attributes = new Map();
					this._stops = [];

					this._setAttribute('id', id);
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
				},
				_getAttribute: function(key) {
					return this._attributes.has(key) ? this._attributes.get(key) : null;
				},
				_setAttribute: function(key, value) {
					if (value === null || value === undefined) {
						this._removeAttribute(key);
						return;
					}

					if (this._attributes.get(key) === value) {
						return;
					}

					this._attributes.set(key, value);
					setSvgAttribute(this._element, key, value);
				},
				_removeAttribute: function(key) {
					if (!this._attributes.has(key)) {
						return;
					}

					this._attributes['delete'](key);
					removeSvgAttribute(this._element, key);
				}
			}
		};
		return desc;
	});

	var SVGLinearGradient = SVGGradient.extend(function() {
		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGLinearGradient
			 */
			name: 'h5.ui.components.stage.SVGLinearGradient',
			accessor: {},
			method: {
				constructor: function SVGLinearGradient(element, id) {
					SVGLinearGradient._super.call(this, element, id);
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

		addSimpleGradientAccessor(desc.accessor, ['x1', 'y1', 'x2', 'y2', 'spreadMethod']);
		return desc;
	});

	var SVGRadialGradient = SVGGradient.extend(function() {
		var desc = {
			/**
			 * @memberOf h5.ui.components.stage.SVGRadialGradient
			 */
			name: 'h5.ui.components.stage.SVGRadialGradient',
			accessor: {},
			method: {
				constructor: function SVGRadialGradient(element, id) {
					SVGRadialGradient._super.call(this, element, id);
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

		addSimpleGradientAccessor(desc.accessor, ['cx', 'cy', 'r', 'fx', 'fy', 'spreadMethod']);
		return desc;
	});

	var SVGGraphics = RootClass.extend(function() {
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
					SVGGraphics._super.call(this);
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
				//TODO 未実装
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
				}
			}
		};
		return desc;
	});

	var SimpleSet = RootClass.extend(function() {
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
					SimpleSet._super.call(this);
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

	var ERR_CANNOT_MOVE_OFFSTAGE_DU = 'Stageに追加されていないDisplayUnitはディスプレイ座標系に基づいた移動はできません。';

	//TODO layouter(仮)を差し込めるようにし、
	//layouterがいる場合にはx,y,w,hをセットしようとしたときに
	//layouterがフックして強制ブロック・別の値をセット等できるようにする
	var DisplayUnit = h5.cls.RootClass.extend(function() {
		var duIdSequence = 0;

		var classDesc = {
			name: 'h5.ui.components.stage.DisplayUnit',
			isAbstract: true,
			field: {
				id: null,

				//TODO privateなプロパティへの対応
				_parentDU: null,

				_rootStage: null,

				_groupTag: null
			},
			accessor: {
				x: null,
				y: null,
				width: null,
				height: null,
				domRoot: null,
				extraData: null,
				groupTag: {
					get: function() {
						return this._groupTag;
					}
				}
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayUnit
				 */
				constructor: function DisplayUnit(id) {
					DisplayUnit._super.call(this);
					//TODO 引数のIDは必須にする？？
					if (id == null) {
						//TODO ただの連番でなくGUID等にする
						this.id = 'duid_' + duIdSequence;
						duIdSequence++;
					} else {
						//TODO IDが渡された場合は一意性チェックを入れたい(※ここではなく、StageにaddされるときにStage側が行う)
						this.id = id;
					}

					//TODO prop.defaultValueで
					this.x = 0;
					this.y = 0;
					this.width = 0;
					this.height = 0;

					this._groupTag = SimpleSet.create();
				},

				setRect: function(rect) {
					this.x = rect.x;
					this.y = rect.y;
					this.width = rect.width;
					this.height = rect.height;

					//TODO 仮実装
					setSvgAttributes(this.domRoot, {
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height
					});
				},

				getRect: function() {
					var rect = Rect.create(this.x, this.y, this.width, this.height);
					return rect;
				},

				remove: function() {
					if (this._parentDU) {
						this._parentDU.removeDisplayUnit(this);
					}
				},

				moveTo: function(x, y) {
					this.x = x;
					this.y = y;

					//TODO 仮実装
					setSvgAttributes(this.domRoot, {
						x: x,
						y: y
					});
				},

				moveBy: function(x, y) {
					this.x += x;
					this.y += y;

					//TODO 仮実装
					setSvgAttributes(this.domRoot, {
						x: this.x,
						y: this.y
					});
				},

				moveDisplayTo: function(x, y) {
					if (!this._rootStage) {
						throw new Error(ERR_CANNOT_MOVE_OFFSTAGE_DU);
					}
					var worldPos = this._rootStage._viewport.getWorldPosition(x, y);
					this.moveTo(worldPos.x, worldPos.y);
				},

				moveDisplayBy: function(x, y) {
					if (!this._rootStage) {
						throw new Error(ERR_CANNOT_MOVE_OFFSTAGE_DU);
					}
					var wx = this._rootStage._viewport.getXLengthOfWorld(x);
					var wy = this._rootStage._viewport.getYLengthOfWorld(y);
					this.moveBy(wx, wy);
				},

				scrollIntoView: function() {
				//TODO
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

				_onAddedToRoot: function(stage) {
					this._rootStage = stage;
				}

			//				scrollIntoView: {
			//					func: function () {
			//
			//					},
			//					type: ['int', 'int']
			//				}
			}
		};

		return classDesc;
	});



	var BasicDisplayUnit = DisplayUnit.extend({
		name: 'h5.ui.components.stage.BasicDisplayUnit',
		field: {
			/**
			 * この要素を現在ドラッグ可能かどうか
			 */
			isDraggable: null,
			_graphics: null,
			_renderer: null,
			_isSelected: null,
			_isFocused: null,
			_rootSvg: null,

			/**
			 * この要素を現在選択可能かどうか
			 */
			_isSelectable: null
		},
		accessor: {
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
			constructor: function BasicDisplayUnit(id) {
				BasicDisplayUnit._super.call(this, id);

				this._isSelectable = true;
				this.isDraggable = true;

				this._isSelected = false;
				this._isFocused = false;

				//TODO 仮想化
				this.domRoot = createSvgElement('svg');
				this._rootSvg = this.domRoot;
				this.domRoot.setAttribute('data-h5-dyn-stage-role', 'basicDU'); //TODO for debugging
				this.domRoot.setAttribute('data-h5-dyn-du-id', this.id);
				//this.domRoot = this._graphics._rootSvg; //TODO domRoot -> rootDom, rootElement
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
				if (!this._graphics) {
					return;
				}

				//TODO ここの描画自体も遅延させる
				this._renderer(this._graphics, this);

				if (!this._graphics.isDirty) {
					return;
				}

				var that = this;
				//TODO rAFをここで直接使わない
				requestAnimationFrame(function() {
					that._graphics.render();
				}, 0);
			},

			select: function(isExclusive) {
				if (!this._rootStage) {
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
				this._rootStage.focus(this);
			},

			unfocus: function(andUnselect) {
				if (!this._rootStage) {
					return;
				}
				this._rootStage.unfocus(andUnselect);
			},

			//TODO 引数に位置を取れるようにする？
			//TODO BasicDUに持たせる？ContentsDU?
			scrollIntoView: function() {
			//TODO 未実装。このDUが画面上に表示されるようにStageをスクロールする
			},

			_onAddedToRoot: function(stage) {
				//TODO _superでなくgetParentClass()を
				BasicDisplayUnit._super.prototype._onAddedToRoot.call(this, stage);
				this._rootStage = stage;

				this._graphics = stage._createGraphics(this.domRoot);
				this.requestRender();
			}

		}
	});

	//TODO Path <- Edge などとする
	//TODO DUからrect系をはずすか
	var Edge = DisplayUnit.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.Edge',
			field: {
				_svgLine: null,
				_from: null,
				_to: null,
				_endpointFrom: null,
				_endpointTo: null
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
					Edge._super.call(this);
					this._from = duFrom;
					this._to = duTo;

					this._endpointFrom = EdgeEndpoint.create();
					this._endpointTo = EdgeEndpoint.create();

					this.domRoot = createSvgElement('svg');
					this.domRoot.setAttribute('data-stage-role', 'edge'); //TODO for debugging
					//this._render();
				},
				setRect: function() {
					throw new Error('EdgeではsetRectは使えません');
				},
				_render: function() {
					//TODO 仮実装
					//バインドされているDUの位置が変わったら再描画が必要
					var fr = this._from.getRect();
					var tr = this._to.getRect();

					var fwPos = this._from.getWorldGlobalPosition();
					var twPos = this._to.getWorldGlobalPosition();

					//From,Toノードの中心座標を計算
					var fwCenterY = fwPos.y + fr.height / 2;

					//初回のみlineを生成
					if (!this._svgLine) {
						this._svgLine = createSvgElement('line');
						this.domRoot.appendChild(this._svgLine);
					}
					var line = this._svgLine;

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

					setSvgAttributes(line, {
						x1: x1,
						y1: y1,
						x2: x2,
						y2: y2
					});
				},

				//TODO BasicDUにも同じメソッドがある。クラス階層について要検討
				requestRender: function() {
					//TODO 正しくは次の再描画フレームで描画
					if (!this._rootStage) {
						return;
					}

					//TODO rAFをここで直接使わない
					var that = this;
					requestAnimationFrame(function() {
						that._render();
					});
				},

				_onAddedToRoot: function(stage) {
					this._rootStage = stage;
					this.requestRender();
				}
			}
		};
		return desc;
	});

	var EdgeEndpoint = RootClass.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.EdgeEndpoint',

			accessor: {
				//top, middle, bottom, offset, null
				junctionVerticalAlign: null,

				//left, center, right, offset, null
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
					EdgeEndpoint._super.call(this);
				}

			}
		};
		return desc;
	});

	var DisplayUnitContainer = DisplayUnit.extend(function() {
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

		var desc = {
			name: 'h5.ui.components.stage.DisplayUnitContainer',
			field: {
				_rootG: null,
				_children: null,
				_scaleX: null,
				_scaleY: null,
				_scrollX: null,
				_scrollY: null
			},
			method: {
				/**
				 * @memberOf h5.ui.components.stage.DisplayUnitContainer
				 */
				constructor: function DisplayUnitContainer(id) {
					DisplayUnitContainer._super.call(this, id);

					//TODO defaultValue
					this.x = 0;
					this.y = 0;
					this.width = 0;
					this.height = 0;

					this._scaleX = 1;
					this._scaleY = 1;

					this._scrollX = 0;
					this._scrollY = 0;

					this._children = [];

					//TODO ここではsvgは作らない。
					this.domRoot = createSvgElement('svg');
					this.domRoot.setAttribute('data-stage-role', 'container'); //TODO for debugging

					//TODO 暫定的に、コンテナはoverflow:visibleにするようにした
					//width, heightの指定との整合性について検討
					this.domRoot.setAttribute('overflow', 'visible');

					//rootGは<g>要素。transformを一括してかけるため、
					//子要素は全てこの<g>の下に追加する。
					this._rootG = createSvgElement('g');
					this.domRoot.appendChild(this._rootG);
				},

				addDisplayUnit: function(du) {
					this._children.push(du);
					this._rootG.appendChild(du.domRoot);
					du._parentDU = this;

					if (this._rootStage) {
						du._onAddedToRoot(this._rootStage);
					}
				},

				removeDisplayUnit: function(du) {
					var idx = this._children.indexOf(du);
					if (idx !== -1) {
						this._children.splice(idx, 1);
						this._rootG.removeChild(du.domRoot);
						du._parentDU = null;

						//TODO 指定されたduがコンテナの場合にそのduの子供のrootStageも再帰的にnullにする
						du._rootStage = null;
					}
				},

				getDisplayUnitById: function(id) {
					var ret = getDisplayUnitByIdInner(this, id);
					return ret;
				},

				getDisplayUnitAll: function() {
					return this._children;
				},

				_onAddedToRoot: function(rootStage) {
					this._rootStage = rootStage;

					var children = this._children;
					for (var i = 0, len = children.length; i < len; i++) {
						var du = children[i];
						du._onAddedToRoot(rootStage);
					}
				},

				setScale: function(scaleX, scaleY) {
					if (scaleX != null) {
						this._scaleX = scaleX;
					}
					if (scaleY != null) {
						this._scaleY = scaleY;
					}
					this._updateTransform();
				},

				scrollTo: function(worldX, worldY) {
					//				var oldPos = DisplayPoint.create(this._scrollX, this._scrollY);

					this._scrollX = worldX;
					this._scrollY = worldY;
					this._updateTransform();

					//				var newPos = WorldPoint.create(worldX, worldY);

					//				var evArg = {
					//					scrollPosition: {
					//						oldValue: oldPos,
					//						newValue: newPos,
					//						isChanged: true
					//					},
					//					scale: {
					//						oldValue: {
					//							x: this._scaleX,
					//							y: this._scaleY
					//						},
					//						newValue: {
					//							x: this._scaleX,
					//							y: this._scaleY
					//						},
					//						isChanged: false
					//					}
					//				};
					//				this.trigger(EVENT_SIGHT_CHANGE, evArg);
				},

				scrollBy: function(worldX, worldY) {
					var x = this._scrollX + worldX;
					var y = this._scrollY + worldY;
					this.scrollTo(x, y);
				},

				_updateTransform: function() {
					var transform = h5.u.str.format('scale({0},{1}) translate({2},{3})',
							this._scaleX, this._scaleY, -this._scrollX, -this._scrollY);
					this._rootG.setAttribute('transform', transform);
				}
			}
		};
		return desc;
	});


	//TODO LayerはDUの子クラスにしない方がよいか（DUContainerと一部が同じだとしても）
	var Layer = DisplayUnitContainer.extend(function() {
		var desc = {
			name: 'h5.ui.components.stage.Layer',
			field: {
				canUIScrollX: null,
				canUIScrollY: null,
				scrollRangeX: null,
				scrollRangeY: null
			},
			method: {
				/**
				 * @constructor
				 * @memberOf h5.ui.components.stage.Layer
				 */
				constructor: function Layer(id) {
					Layer._super.call(this);
					this.x = 0;
					this.y = 0;
					this.width = 0;
					this.height = 0;

					this._children = [];

					//TODO ここではsvgは作らない。
					//this.domRoot = createSvgElement('svg');
					this.domRoot.setAttribute('data-stage-role', 'layer');
					//				this.domRoot.setAttribute('x', 0);
					//				this.domRoot.setAttribute('y', 0);
					//				this.domRoot.setAttribute('width', 1000);
					//				this.domRoot.setAttribute('height', 1000);

					this.id = id;
					//					this._canScrollX = true;
					//					this._canScrollY = true;
				},

				addDisplayUnit: function(du) {
					Layer._super.prototype.addDisplayUnit.call(this, du);
					//du._onAddedToRoot(this._rootStage);
				},

				getWorldGlobalPosition: function() {
					var p = WorldPoint.create(this.x, this.y);
					return p;
				},

				_onAddedToRoot: function(stage) {
					this._rootStage = stage;
					Layer._super.prototype._onAddedToRoot.call(this, stage);
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

	var stageLogic = {
		__name: 'h5.ui.components.stage.StageLogic'
	};

})(jQuery);


(function($) {

	var RootClass = h5.cls.RootClass;
	var stageModule = h5.ui.components.stage;

	var Viewport = RootClass.extend(function() {

		var desc = {
			name: 'h5.ui.components.stage.Viewport',

			field: {
				_displayRect: null,
				_worldRect: null,
				_scaleX: null,
				_scaleY: null
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
					Viewport._super.call(this);
					this._displayRect = stageModule.Rect.create();
					this._worldRect = stageModule.Rect.create();
					this._scaleX = 1;
					this._scaleY = 1;
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
					var point = stageModule.DisplayPoint.create(dispX, dispY);
					return point;
				}
			}
		};
		return desc;
	});

	var EVENT_SIGHT_CHANGE = 'stageSightChange';

	var DisplayPoint = stageModule.DisplayPoint;
	var BasicDisplayUnit = h5.cls.manager.getClass('h5.ui.components.stage.BasicDisplayUnit');

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

	var DRAG_MODE_NONE = 0;
	var DRAG_MODE_SCREEN = 1;
	var DRAG_MODE_DU = 2;

	var stageController = {
		/**
		 * @memberOf h5.ui.components.stage.StageController
		 */
		__name: 'h5.ui.components.stage.StageController',

		//ルートとなるSVG要素
		_duRoot: null,

		_units: null,

		//ビューポートの大きさを表すRect。ワールド座標系。
		_worldViewportRect: null,

		_viewport: null,

		_scaleX: 1,

		_scaleY: 1,

		_initData: null,

		_defs: null,

		_hasDefs: false,

		//UI操作によってスクロールするかどうか
		canUIScrollX: true,

		canUIScrollY: true,

		//(UI操作によるかどうかは関係なく)スクロールする範囲を配列で指定。
		//[from, to] をWorld座標で指定。
		scrollRangeX: null,

		scrollRangeY: null,

		//TODO dependsOn()
		_selectionLogic: h5.ui.SelectionLogic,

		select: function(displayUnit, isExclusive) {
			this._selectionLogic.select(displayUnit, isExclusive);
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

		getSelectedDisplayUnits: function() {
			var selected = this._selectionLogic.getSelected();
			return selected;
		},

		isSelected: function(displayUnit) {
			var isSelected = this._selectionLogic.isSelected(displayUnit);
			return isSelected;
		},

		focus: function(displayUnit) {
			return this._selectionLogic.focus(displayUnit);
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

		_getDefs: function() {
			if (!this._hasDefs) {
				var SVGDefinitions = h5.cls.manager
						.getClass('h5.ui.components.stage.SVGDefinitions');
				var element = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
				this._defs = SVGDefinitions.create(element);
				this._duRoot.appendChild(element);
				this._hasDefs = true;
			}
			return this._defs;
		},

		_createGraphics: function(svgRoot) {
			var SVGGraphics = h5.cls.manager.getClass('h5.ui.components.stage.SVGGraphics');
			var graphics = SVGGraphics.create(svgRoot, this._getDefs());
			return graphics;
		},

		__construct: function() {
			this._units = new Map();
			this._layers = [];
			this._viewport = Viewport.create();
			this._dragMode = DRAG_MODE_NONE;
		},

		__ready: function() {
			if (!this._duRoot) {
				var rootSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				this._duRoot = rootSvg;
				//rootSvg.setAttribute('overflow', 'visible');
			}
			//$(this._root).css('position', 'relative');

			this._selectionLogic.addSelectionListener(function(du, isSelected, isFocused) {
				du._isSelected = isSelected;
				du._isFocused = isFocused;
			});

			this.rootElement.appendChild(this._duRoot);

			this._setupRootEventListeners();

			this.refresh(true);
		},

		_setupRootEventListeners: function() {
			var root = this.rootElement;
			//SVG要素はjQueryでは明示的にはサポートしていない(イベントハンドラなどは実際には動くが)こと、
			//また、今回は独自にイベントを発生させるために内部的にキャッチしたいので
			//直接リッスンする
			//TODO removeする
			root.addEventListener('click', this.own(this._rootClickHandler));
			root.addEventListener('dblclick', this.own(this._rootDblclickHandler));
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
				if (BasicDisplayUnit.isClassOf(du)) {
					return du;
				}
				return getIncludingDUInner.call(this, elem.parentNode);
			}

			var root = this.rootElement;

			var ret = getIncludingDUInner.call(this, target);
			return ret;
		},

		_rootClickHandler: function(event) {
			this._processClick(event, 'duClick');
		},

		_rootDblclickHandler: function(event) {
			this._processClick(event, 'duDblclick');
		},

		_processClick: function(event, triggerEventName) {
			var du = this._getIncludingDisplayUnit(event.target);
			var isExclusive = !event.shiftKey;
			if (!du) {
				if (isExclusive) {
					this._selectionLogic.unselectAll();
				}
				return;
			}
			du.select(isExclusive);
			du.focus();

			var evArg = {
				stageController: this,
				displayUnit: du
			};
			this.trigger(triggerEventName, evArg);
		},

		_dragMode: DRAG_MODE_NONE, // DRAG_MODE_SCREEN = 1; DRAG_MODE_DU = 2;

		_dragTargetDU: null,

		'{rootElement} h5trackstart': function(context) {
			var event = context.event;
			var du = this._getIncludingDisplayUnit(event.target); //BasicDUを返す

			this._dragMode = DRAG_MODE_NONE;

			if (du) {
				if (du.isDraggable) {
					this._dragMode = DRAG_MODE_DU;
					this._dragTargetDU = du;
				}
			} else {
				this._dragMode = DRAG_MODE_SCREEN;
			}
		},

		'{rootElement} h5trackmove': function(context) {
			if (this._dragMode === DRAG_MODE_NONE) {
				return;
			}

			var dispDx = context.event.dx;
			var dispDy = context.event.dy;

			switch (this._dragMode) {
			case DRAG_MODE_DU:
				this._dragTargetDU.moveDisplayBy(dispDx, dispDy);
				break;
			case DRAG_MODE_SCREEN:
				this.scrollBy(-dispDx, -dispDy);
				break;
			default:
				break;
			}
		},

		'{rootElement} h5trackend': function(context) {
			this._dragMode = DRAG_MODE_NONE;
			this._dragTargetDU = null;
		},

		//_dragController: h5.ui.components.stage.DragController,

		_updateRootSize: function(width, height) {
			var w = width !== undefined ? width : $(this.rootElement).width();
			var h = height !== undefined ? height : $(this.rootElement).height();

			this._duRoot.setAttributeNS(null, 'width', w);
			this._duRoot.setAttributeNS(null, 'height', h);

			this._viewport.setDisplaySize(w, h);
			this._updateViewBox();
		},

		_updateViewBox: function() {
			//TODO ViewBoxで全体のスクロールやスケールを実現するかどうかは
			//パフォーマンス等の観点を考えて検討

			var wr = this._viewport.getWorldRect();

			//位置は変えない
			var x = 0;
			var y = 0;
			var w = wr.width;
			var h = wr.height;

			this._duRoot.setAttribute('viewBox', h5.u.str.format('{0} {1} {2} {3}', x, y, w, h));
		},

		setup: function(initData) {
			//TODO setup()が__readyより前などいつ呼ばれても正しく動作するようにする

			this._initData = initData;

			if (initData.layers) {
				for (var i = 0, len = initData.layers.length; i < len; i++) {
					var layer = stageModule.Layer.create(initData.layers[i].id);
					this.addLayer(layer);
				}
			}
		},

		addDisplayUnit: function(displayUnit) {
			this._units.set(displayUnit.id, displayUnit);
			this._duRoot.appendChild(displayUnit.domRoot);

			displayUnit.domRoot.setAttributeNS(null, 'x', displayUnit.x);
			displayUnit.domRoot.setAttributeNS(null, 'y', displayUnit.y);

			if (displayUnit._renderer) {
				displayUnit._renderer();
			}

		},

		removeDisplayUnit: function(displayUnit) {
			this.removeById(displayUnit.id);
		},

		removeDisplayUnitById: function(id) {
			//FIXME deleteが失敗する
			this._unit["delete"](displayUnit.id);
			this._duRoot.removeChild(displayUnit.domRoot);
		},

		removeDisplayUnitAll: function() {
		//TODO
		},

		addLayer: function(layer, index) {
			if (index != null) {
				this._layers.splice(index, 0, layer);
			} else {
				this._layers.push(layer);
			}
			this._duRoot.appendChild(layer.domRoot);
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
			var oldPos = DisplayPoint.create(this._viewport.displayX, this._viewport.displayY);

			this._viewport.scrollTo(dispX, dispY);

			//TODO 移動制限
			for (var i = 0, len = this._layers.length; i < len; i++) {
				var layer = this._layers[i];
				layer.scrollTo(this._viewport.worldX, this._viewport.worldY);
			}

			var newPos = DisplayPoint.create(dispX, dispY);

			//TODO 現在はこの場所でイベントを出しているが、
			//将来的にはrefresh()のスロットの中で（非同期化された描画更新フレーム処理の中で）
			//描画更新後にイベントをあげるようにする
			var evArg = {
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
			this.trigger(EVENT_SIGHT_CHANGE, evArg);
		},

		scrollBy: function(displayDx, displayDy) {
			var dx = this._viewport.displayX + displayDx;
			var dy = this._viewport.displayY + displayDy;
			this.scrollTo(dx, dy);
		},

		scrollWorldTo: function(worldX, worldY) {
			this._viewport.scrollWorldTo(worldX, worldY);
		},

		scrollWorldBy: function(worldDx, worldDy) {
			var dx = this._viewport.worldX + worldDx;
			var dy = this._viewport.worldY + worldDy;
			this.scrollWorldTo(dx, dy);
		},

		/**
		 * @param scaleX X軸方向の拡大率。nullの場合は現在のまま変更しない。
		 * @param scaleY Y軸方向の拡大率。nullの場合は現在のまま変更しない。
		 * @param displayOffsetX 拡縮時の中心点のx（ディスプレイ座標系におけるoffsetX(stageのルート要素の左上を基準とした座標)）
		 * @param displayOffsetY 拡縮時の中心点のy（仕様はxと同じ）
		 */
		setScale: function(scaleX, scaleY, displayOffsetX, displayOffsetY) {
			if (scaleX === this._viewport.scaleX && scaleY === this._viewport.scaleY) {
				return;
			}

			var offX = displayOffsetX;
			var offY = displayOffsetY;

			if (displayOffsetX == null && displayOffsetY == null) {
				var rootOffset = $(this.rootElement).offset();
				if (displayOffsetX == null) {
					offX = rootOffset.left + this._viewport.displayWidth / 2;
				}
				if (displayOffsetY == null) {
					offY = rootOffset.top + this._viewport.displayHeight / 2;
				}
			}

			var scaleCenter = this._viewport.getWorldPositionFromDisplayOffset(offX, offY);

			var oldScrollPos = DisplayPoint
					.create(this._viewport.displayX, this._viewport.displayY);
			var oldScaleX = this._viewport.scaleX;
			var oldScaleY = this._viewport.scaleY;

			this._viewport.setScale(scaleX, scaleY, scaleCenter.x, scaleCenter.y);

			for (var i = 0, len = this._layers.length; i < len; i++) {
				var layer = this._layers[i];
				layer.setScale(this._viewport.scaleX, this._viewport.scaleY);
				layer.scrollTo(this._viewport.worldX, this._viewport.worldY);
			}

			var newScrollPos = DisplayPoint
					.create(this._viewport.displayX, this._viewport.displayY);

			var isScrollPoisitionChanged = true;
			if (oldScrollPos.x === newScrollPos.x && oldScrollPos.y === newScrollPos.y) {
				isScrollPoisitionChanged = false;
			}

			//TODO 現在はこの場所でイベントを出しているが、
			//将来的にはrefresh()のスロットの中で（非同期化された描画更新フレーム処理の中で）
			//描画更新後にイベントをあげるようにする
			var evArg = {
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
						x: scaleX,
						y: scaleY
					},
					isChanged: true
				}
			};
			this.trigger(EVENT_SIGHT_CHANGE, evArg);
		},

		refresh: function(immediate) {
			this._updateRootSize();
		},

		getScrollPosition: function() {
			var pos = stageModule.DisplayPoint.create(this._worldViewportRect.x,
					this._worldViewportRect.y);
			return pos;
		},

		// dragScroll
		_manipMode: null,

		'{rootElement} dgDragStart': function(context, $el) {
			var ds = context.evArg.dragSession;
			ds.addDragCallback(this._own(this._onDragMove));
		},

		'{rootElement} mousewheel': function(context, $el) {
			var event = context.event;

			event.preventDefault();

			// TODO どの操作でどうするかは要検討
			if (event.shiftKey) {
				// シフトキーが押されていたら拡大縮小
				var ds = 0.1;
				if (event.originalEvent.wheelDelta < 0) {
					ds *= -1;
				}

				var rootOffset = $(this.rootElement).offset();
				var offsetX = event.originalEvent.pageX - rootOffset.left;
				var offsetY = event.originalEvent.pageY - rootOffset.top;

				this.setScale(this._viewport.scaleX + ds, this._viewport.scaleY + ds, offsetX,
						offsetY);
				return;
			}

			var dy = 40;
			if (event.originalEvent.wheelDelta < 0) {
				dy *= -1;
			}
			this.scrollBy(0, dy);
		},

		_onDragMove: function(ds, dx, dy) {
			this.scrollBy(dx, dy);
		}
	};


	h5.core.expose(stageController);

})(jQuery);
