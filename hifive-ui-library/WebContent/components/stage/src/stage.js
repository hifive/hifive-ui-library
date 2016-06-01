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

	var Rect = RootClass.extend({
		name: 'h5.ui.components.stage.Rect',
		property: {
			x: {
				isAccessor: true
			},
			y: {
				isAccessor: true
			},
			width: {
				isAccessor: true
			},
			height: {
				isAccessor: true
			}
		},
		method: {
			/**
			 * @memberOf h5.ui.components.stage.Rect
			 */
			constructor: function Rect(x, y, width, height) {
				Rect._super.call(this);
				this._p_x = x !== undefined ? x : 0;
				this._p_y = y !== undefined ? y : 0;
				this._p_width = width !== undefined ? width : 0;
				this._p_height = height !== undefined ? height : 0;
			}
		}
	});

	function createSvgElement(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	function setSvgAttribute(element, key, value) {
		element.setAttributeNS(null, key, value);
	}

	function setSvgAttributes(element, param) {
		for ( var key in param) {
			element.setAttributeNS(null, key, param[key]);
		}
	}

	var SVGDrawElement = RootClass.extend({
		name: 'h5.ui.components.stage.SVGDrawElement',
		property: {
			_element: null
		},
		method: {
			constructor: function SVGDrawElement() {
				SVGDrawElement._super.call(this);
			},
			setElement: function(element) {
				//TODO こんすとらくた渡しにする
				this._element = element;
			},
			getElement: function() {
				return this._element;
			},
			setAttribute: function(key, value) {
				setSvgAttribute(this._element, key, value);
			},
			setAttributes: function(param) {
				setSvgAttributes(this._element, param);
			}
		},
	});

	var SVGLine = SVGDrawElement.extend({
		name: 'h5.ui.components.stage.SVGLine',
		method: {
			constructor: function SVGLine() {
				SVGLine._super.call(this);
			}
		}
	});

	var SVGText = SVGDrawElement.extend({
		name: 'h5.ui.components.stage.SVGText',

		property: null,

		method: {
			constructor: function SVGText() {
				SVGText._super.call(this);
			},
			setText: function(text) {
				var str = document.createTextNode(text);
				this._element.appendChild(str);
			}
		}
	});


	var SVGGraphics = RootClass.extend({
		name: 'h5.ui.components.stage.SVGGraphics',
		property: {
			_rootSvg: null
		},
		method: {
			constructor: function SVGGraphics() {
				SVGGraphics._super.call(this);
			},

			drawLine: function() {
				var line = createSvgElement('line');
				this._rootSvg.appendChild(line);
				var sl = SVGLine.create();
				sl.setElement(line);
				return sl;
			},
			drawRect: function() {
				var rect = createSvgElement('rect');
				this._rootSvg.appendChild(rect);
				var de = SVGDrawElement.create();
				de.setElement(rect);
				return de;
			},
			drawCircle: function() {
				var circle = createSvgElement('circle');
				this._rootSvg.appendChild(circle);
				var de = SVGDrawElement.create();
				de.setElement(circle);
				return de;
			},
			drawText: function() {
				var text = createSvgElement('text');
				this._rootSvg.appendChild(text);
				var de = SVGText.create();
				de.setElement(text);
				de.setText(text);
				return de;
			}
		}
	});

	//TODO layouter(仮)を差し込めるようにし、
	//layouterがいる場合にはx,y,w,hをセットしようとしたときに
	//layouterがフックして強制ブロック・別の値をセット等できるようにする
	var DisplayUnit = h5.cls.RootClass.extend(function() {
		var duIdSequence = 0;

		var classDesc = {
			name: 'h5.ui.components.stage.DisplayUnit',
			property: {
				id: null,

				//TODO privateなプロパティへの対応
				_parentDU: null,

				x: {
					isAccessor: true
				},
				y: {
					isAccessor: true
				},
				width: {
					isAccessor: true
				},
				height: {
					isAccessor: true
				},
				domRoot: {
					isAccessor: true
				},
				extraData: {
					isAccessor: true
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
					} else {
						//TODO IDが渡された場合は一意性チェックを入れたい(※ここではなく、StageにaddされるときにStage側が行う)
						this.id = id;
					}
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

				scrollIntoView: function() {
				//TODO
				},

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
		property: {
			_graphics: null,
			_renderer: null,
			isSelected: {
				isAccessor: true
			}
		},
		method: {
			constructor: function BasicDisplayUnit() {
				BasicDisplayUnit._super.call(this);

				//TODO 仮想化
				this._graphics = SVGGraphics.create();
				this._graphics._rootSvg = createSvgElement('svg');
				this.domRoot = this._graphics._rootSvg;
				this.domRoot.setAttribute('data-stage-role', 'basicDU'); //TODO for debugging
			},
			/**
			 * @memberOf h5.ui.components.stage.BasicDisplayUnit
			 */
			setRenderer: function(renderer) {
				this._renderer = renderer;
			}
		}
	});


	var DisplayUnitContainer = DisplayUnit.extend({
		name: 'h5.ui.components.stage.DisplayUnitContainer',
		property: {
			_children: null
		},
		method: {
			/**
			 * @memberOf h5.ui.components.stage.DisplayUnitContainer
			 */
			constructor: function DisplayUnitContainer() {
				DisplayUnitContainer._super.call(this);

				//TODO defaultValue
				this.x = 0;
				this.y = 0;
				this.width = 0;
				this.height = 0;

				this._children = [];

				//TODO ここではsvgは作らない。
				this.domRoot = createSvgElement('svg');
				this.domRoot.setAttribute('data-stage-role', 'container');
			},

			addDisplayUnit: function(du) {
				this._children.push(du);
				this.domRoot.appendChild(du.domRoot);
				if (typeof du._renderer === 'function') {
					du._renderer(du._graphics, du);
				}
				du._parentDU = this;
			},

			removeDisplayUnit: function(du) {
				var idx = this._children.indexOf(du);
				if (idx !== -1) {
					this._children.splice(idx, 1);
					this.domRoot.removeChild(du.domRoot);
					du._parentDU = null;
				}
			},

			getDisplayUnitById: function(id) {
				return null; //TODO
			},

			getDisplayUnitAll: function() {
				return this._children;
			}
		}
	});


	//TODO LayerはDUの子クラスにしない方がよいか（DUContainerと一部が同じだとしても）
	var Layer = DisplayUnitContainer.extend({
		name: 'h5.ui.components.stage.Layer',
		property: {
			_canScrollX: true,
			_canScrollY: true
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
				this.domRoot = createSvgElement('svg');
				this.domRoot.setAttribute('data-stage-role', 'layer');
				//				this.domRoot.setAttribute('x', 0);
				//				this.domRoot.setAttribute('y', 0);
				//				this.domRoot.setAttribute('width', 1000);
				//				this.domRoot.setAttribute('height', 1000);

				this.id = id;
				this._canScrollX = true;
				this._canScrollY = true;
			}
		}
	});

	h5.u.obj.expose('h5.ui.components.stage', {
		BasicDisplayUnit: BasicDisplayUnit,
		Layer: Layer,
		DisplayUnitContainer: DisplayUnitContainer,
		Rect: Rect
	});

	var stageLogic = {
		__name: 'h5.ui.components.stage.StageLogic'
	};

})(jQuery);


(function($) {

	var stageModule = h5.ui.components.stage;

	var stageController = {
		/**
		 * @memberOf h5.ui.components.stage.StageController
		 */
		__name: 'h5.ui.components.stage.StageController',

		_root: null,

		_units: null,

		__construct: function() {
			this._units = new Map();
			this._layers = [];
			this._rect = stageModule.Rect.create(0, 0, 0, 0);
		},

		__ready: function() {
			if (!this._duRoot) {
				var rootSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				this._duRoot = rootSvg;
			}
			//$(this._root).css('position', 'relative');


			this.rootElement.appendChild(this._duRoot);

			this.refresh();
		},

		_initData: null,

		_updateRootSize: function(width, height) {
			var w = width !== undefined ? width : $(this.rootElement).width();
			var h = height !== undefined ? height : $(this.rootElement).height();

			this._duRoot.setAttributeNS(null, 'width', w);
			this._duRoot.setAttributeNS(null, 'height', h);

			this._rect.width = w;
			this._rect.height = h;
			this._updateViewBox();
		},

		_updateViewBox: function() {
			//TODO ViewBoxで全体のスクロールやスケールを実現するかどうかは
			//パフォーマンス等の観点を考えて検討
			this._duRoot.setAttribute('viewBox', h5.u.str.format('{0} {1} {2} {3}', this._rect.x,
					this._rect.y, this._rect.width, this._rect.height));
		},

		setup: function(initData) {
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

		_rect: null,

		scrollTo: function(lx, ly) {
			this._rect.x = lx;
			this._rect.y = ly;
			this._updateViewBox();
		},

		scrollBy: function(lx, ly) {
			this._rect.x += lx;
			this._rect.y += ly;
			this._updateViewBox();
		},

		scrollWorldTo: function(wx, wy) {

		},

		scrollWorldBy: function(wx, wy) {

		},

		refresh: function(immediate) {
			this._updateRootSize();
		}
	};

	h5.core.expose(stageController);

})(jQuery);
