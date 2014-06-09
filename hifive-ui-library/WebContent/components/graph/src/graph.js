/*
 * Copyright (C) 2012-2014 NS Solutions Corporation
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

	var EDGE_SCROLL_INTERVAL = 16;

	var EDGE_SCROLL_VALUE = 10;

	var RANGE_THRESHOLD_LEN = 4;
	var RANGE_IN = '_in_';
	var RANGE_OUT = '_out_';

	function getEdgePosition(element, pageX, pageY, borderWidth) {
		var $el = $(element);

		var offset = $el.offset();
		var ex = offset.left;
		var ey = offset.top;
		var ew = $el.outerWidth();
		var eh = $el.outerHeight();

		var rangeX = getRange(pageX, [ ex, ex + borderWidth,
				ex + ew - borderWidth, ex + ew ]);
		var rangeY = getRange(pageY, [ ey, ey + borderWidth,
				ey + eh - borderWidth, ey + eh ]);

		if (isOutOfRange(rangeX) || isOutOfRange(rangeY)) {
			return null;
		}

		var dir;

		switch (rangeY) {
		case 0:
			dir = 'n';
			break;
		case 2:
			dir = 's';
			break;
		default:
			dir = '';
			break;
		}

		switch (rangeX) {
		case 0:
			dir += 'w';
			break;
		case 1:
			// 内部(の可能性がある)
			if (rangeY === 1) {
				dir = RANGE_IN;
			} else if (rangeY !== 0 && rangeY !== 2) {
				dir = RANGE_OUT;
			}
			break;
		case 2:
			dir += 'e';
			break;
		default:
			dir = RANGE_OUT;
			break;
		}

		return dir;
	}

	function isOutOfRange(range) {
		if (range < 0 || range >= RANGE_THRESHOLD_LEN) {
			return true;
		}
		return false;
	}

	function getRange(val, thresholds) {
		if (val < thresholds[0]) {
			return -1;
		}

		var i = 0;
		var len = thresholds.length - 1;

		for (; i < len; i++) {
			if (val < thresholds[i + 1]) {
				return i;
			}
		}

		if (val === thresholds[len]) {
			return len - 2;
		}

		return len - 1;
	}

	var MSG_NO_SUCH_NODE = '指定されたノードは存在しません。nodeId={0}';

	var DRAG_MODE_NONE = 0;
	var DRAG_MODE_NODE = 1;
	var DRAG_MODE_SCROLL = 2;
	var DRAG_MODE_SELECT = 3;

	var TMPL_DRAG_SELECT_OVERLAY = '<div class="dragSelectOverlay"></div>';

	function wrapInArray(val) {
		return $.isArray(val) ? val : [ val ];
	}

	function isIncluded(containerRegion, containedRegion) {
		if (containedRegion.left >= containerRegion.left
				&& containedRegion.right <= containerRegion.right
				&& containedRegion.top >= containerRegion.top
				&& containedRegion.bottom <= containerRegion.bottom) {
			return true;
		}
		return false;
	}

	function PriorityQueueBase(rank) {
		if (rank === undefined) {
			throw new Error('優先度の数を指定してください');
		}

		this.rank = rank;

		this.queues = [];
		for ( var i = 0; i < rank; i++) {
			this.queues[i] = [];
		}
	}

	PriorityQueueBase.prototype.add = function(rank, var_args) {
		// 一度に大量にaddするならpushで一括で渡した方が速い
		var items = h5.u.obj.argsToArray(arguments);
		items.shift();
		Array.prototype.push.apply(this.queues[rank], items);
	};

	PriorityQueueBase.prototype.peek = function(rank) {
		if (rank === undefined) {
			// rankが指定されない場合、もっとも優先度の高い要素を返す
			for ( var i = 0; i < this.rank; i++) {
				if (this.queues[i].length == 0) {
					continue;
				}
				return this.queues[i][0];
			}
			return undefined;
		} else {
			// rankが指定された場合は、そのrankの中で最初の要素を返す
			if (this.queues[rank].length == 0) {
				return undefined;
			}
			return this.queues[rank][0];
		}
	};

	PriorityQueueBase.prototype.poll = function(rank) {
		if (rank === undefined) {
			// rankが指定されない場合、もっとも優先度の高い要素を返す
			for ( var i = 0; i < this.rank; i++) {
				if (this.queues[i].length == 0) {
					continue;
				}
				return this.queues[i].shift();
			}
			return undefined;
		} else {
			// rankが指定された場合は、そのrankの中で最初の要素を返す
			if (this.queues[rank].length == 0) {
				return undefined;
			}
			return this.queues[rank].shift();
		}
	};

	PriorityQueueBase.prototype.count = function(rank) {
		if (rank === undefined) {
			var count = 0;
			for ( var i = 0; i < this.rank; i++) {
				count += this.queues[i].length;
			}
			return count;
		}
		return this.queues[rank].length;
	};

	PriorityQueueBase.prototype.remove = function(rank) {

	};

	PriorityQueueBase.prototype.clear = function(rank) {
		if (rank === undefined) {
			for ( var i = 0; i < this.rank; i++) {
				this.queues[i] = [];
			}
		} else {
			this.queues[rank] = [];
		}
	};

	/**
	 * @class
	 * @name h5.ui.components.graph.RendererQueue
	 */
	function RendererQueue() {
		this.queue = [];
		for (var i = 0; i < this.rank; i++) {
			this.queue[i] = [];
		}
	}
	RendererQueue.prototype = new PriorityQueueBase(5);
	RendererQueue.IMMEDIATE = 0;
	RendererQueue.HIGHEST = 1;
	RendererQueue.HIGH = 2;
	RendererQueue.MEDIUM = 3;
	RendererQueue.LOW = 4;

	/**
	 * @memberOf RendererQueue
	 * @param var_args
	 *            「即時実行」優先度キューに入れる要素。可変長引数。
	 */
	RendererQueue.prototype.addImmediate = function(var_args) {
		var args = h5.u.obj.argsToArray(arguments);
		args.unshift(RendererQueue.IMMEDIATE);
		this.add.apply(this, args);
	};

	/**
	 * @memberOf RendererQueue
	 * @param var_args
	 *            「最高」優先度キューに入れる要素。可変長引数。
	 */
	RendererQueue.prototype.addHighest = function(var_args) {
		var args = h5.u.obj.argsToArray(arguments);
		args.unshift(RendererQueue.HIGHEST);
		this.add.apply(this, args);
	};

	/**
	 * @memberOf RendererQueue
	 * @param var_args
	 *            「高」優先度キューに入れる要素。可変長引数。
	 */
	RendererQueue.prototype.addHigh = function(var_args) {
		var args = h5.u.obj.argsToArray(arguments);
		args.unshift(RendererQueue.HIGH);
		this.add.apply(this, args);
	};

	/**
	 * @memberOf RendererQueue
	 * @param var_args
	 *            「普通」優先度キューに入れる要素。可変長引数。
	 */
	RendererQueue.prototype.addMedium = function(var_args) {
		var args = h5.u.obj.argsToArray(arguments);
		args.unshift(RendererQueue.MEDIUM);
		this.add.apply(this, args);
	};

	/**
	 * @memberOf RendererQueue
	 * @param var_args
	 *            「低」優先度キューに入れる要素。可変長引数。
	 */
	RendererQueue.prototype.addLow = function(var_args) {
		var args = h5.u.obj.argsToArray(arguments);
		args.unshift(RendererQueue.LOW);
		this.add.apply(this, args);
	};

	function getIEVersion() {
		var appver = navigator.appVersion.toLowerCase();
		if (appver.indexOf('msie') > -1) {
			return parseInt(appver.replace(/.*msie[ ]/, '').match(/^[0-9]+/));
		} else {
			return -1;
		}
	}

	/**
	 * プロパティを作成する。 ES5のObject.definePropertyが使用できない場合は 非標準の__defineGetter__,
	 * __defineSetter__を使用する。 どちらも使用できない場合は例外を発生させる。 参考：
	 * http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx
	 */
	function defineProperty(obj, prop, desc) {
		var ieVer = getIEVersion();
		var isIE = ieVer == -1 ? false : true;
		var isES5Compliant = Object.defineProperty
				&& (!isIE || (isIE && (ieVer >= 9))); // TODO
		// Safari5.0も対応していないのではじく必要あり

		if (isES5Compliant) {
			Object.defineProperty(obj, prop, desc);
		} else if (Object.prototype.__defineGetter__) {
			if ('get' in desc) {
				obj.__defineGetter__(prop, desc.get);
			}
			if ('set' in desc) {
				obj.__defineSetter__(prop, desc.set);
			}
			if ('value' in desc) {
				obj[prop] = desc.value;
			}
		} else {
			throw new Error('defineProperty: プロパティを作成できません');
		}
	}

	/**
	 * ノードを二つ引数にとり、その位置を比較する関数。 ノードのソート時に使用します
	 * この関数を使ってソートすると、インデックスの小さい方がx座標が小さくなる。
	 *
	 * @private
	 * @param {node}
	 *            n1
	 * @param {node}
	 *            n2
	 * @return {number} n1とn2のx座標の差。同じ場合はy座標の差を返します
	 */
	function nodePositionComparer(n1, n2) {
		if (n1 === n2) {
			return 0;
		}
		var def = n1.layoutPos.x - n2.layoutPos.x;
		if (def === 0) {
			def = n1.layoutPos.y - n2.layoutPos.y;
		}
		return def;
	}

	function nodePositionComparerByYAxis(n1, n2) {
		return def = n1.layoutPos.y - n2.layoutPos.y;
	}

	/***************************************************************************
	 * @class
	 * @name h5.ui.components.graph.primitive.ObjectPool
	 **************************************************************************/
	function ObjectPool() {
		this.instanceCreator = null;
		this.preferredReserveSize = 30;
		this.instanceCreatorArgsArray = null;
		this.reserved = [];
		this.active = {};
		this.lastInstanceId = 0;
		this.activeSize = 0;
	}

	/**
	 * オブジェクトプールを作成します。
	 *
	 * @memberOf h5.ui.components.graph.primitive.ObjectPool
	 * @param poolParam
	 *            オブジェクトプールのパラメータ。preferredReserveSizeで予備インスタンスの保持数を指定可能
	 * @param instanceCreatorFunction
	 *            インスタンスを生成し返す関数。オブジェクトを返す必要があります。
	 * @param instanceCreatorFunctionArgsArray
	 *            instanceCreatorFunctionに渡す引数。配列で指定します。
	 * @returns {___pool0}
	 */
	ObjectPool.create = function(poolParam, instanceCreatorFunction,
			instanceCreatorFunctionArgsArray) {
		if ((poolParam != null) && !$.isPlainObject(poolParam)) {
			throw new Error(
					'poolParamがオブジェクトではありません。パラメータを指定する必要がない場合はnullを指定してください。');
		}

		if (!instanceCreatorFunction) {
			throw new Error('インスタンス生成関数を指定してください。');
		}

		var pool = new ObjectPool();

		// パラメータの設定
		if (poolParam) {
			if (poolParam.preferredReserveSize) {
				pool.preferredReserveSize = poolParam.preferredReserveSize;
			}
		}

		// インスタンス生成関数の設定
		pool.instanceCreator = instanceCreatorFunction;
		if (instanceCreatorFunctionArgsArray) {
			pool.instanceCreatorArgsArray = instanceCreatorFunctionArgsArray;
		}

		return pool;
	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.ObjectPool
	 */
	ObjectPool.prototype.borrowObject = function() {
		var instance;
		if (this.reserved.length > 0) {
			instance = this.reserved.pop();
		} else {
			instance = this.instanceCreator.apply(null,
					this.instanceCreatorArgsArray);
			// TODO プロパティ名が固定
			defineProperty(instance, '_piid', {
				value : this.lastInstanceId++
			});
		}

		this.active[instance._piid] = instance;
		this.activeSize++;

		return instance;
	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.ObjectPool
	 */
	ObjectPool.prototype.returnObject = function(obj) {
		var piid = this.active[obj._piid];
		if (!piid) {
			return;
		}

		delete this.active[obj._piid];
		this.activeSize--;

		if (this.reserved.length < this.preferredReserveSize) {
			this.reserved.push(obj);
		}
	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.ObjectPool
	 */
	ObjectPool.prototype.clearReserved = function() {
		this.reserved = [];
	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.ObjectPool
	 */
	ObjectPool.prototype.clearActive = function() {
		this.active = {};
		this.activeSize = 0;
	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.ObjectPool
	 */
	ObjectPool.prototype.clearAll = function() {
		this.clearReserved();
		this.clearActive();
	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.ObjectPool
	 */
	ObjectPool.prototype.getReservedSize = function() {
		return this.reserved.length;
	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.ObjectPool
	 */
	ObjectPool.prototype.getActiveSize = function() {
		return this.activeSize;
	};

	/***************************************************************************
	 * @class
	 * @name h5.ui.components.graph.primitive.EventDispatcher
	 **************************************************************************/
	function EventDispatcher(target) {
		if (target) {
			this._eventTarget = target;
			var that = this;

			target.hasEventListener = function(type, listener) {
				that.hasEventListener(type, listener);
			};
			target.addEventListener = function(type, listener) {
				that.addEventListener(type, listener);
			};
			target.removeEventListener = function(type, listener) {
				that.removeEventListener(type, listener);
			};
			target.dispatchEvent = function(event) {
				that.dispatchEvent(event);
			};
		}
	}

	/**
	 * @memberOf h5.ui.components.graph.primitive.EventDispatcher
	 * @param type
	 * @param listener
	 * @returns {Boolean}
	 */
	EventDispatcher.prototype.hasEventListener = function(type, listener) {
		if (!this._eventListeners) {
			return false;
		}
		var l = this._eventListeners[type];
		if (!l) {
			return false;
		}

		for ( var i = 0, count = l.length; i < count; i++) {
			if (l[i] === listener) {
				return true;
			}
		}
		return false;

	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.EventDispatcher
	 * @param type
	 * @param listener
	 */
	EventDispatcher.prototype.addEventListener = function(type, listener) {
		if (this.hasEventListener(type, listener)) {
			return;
		}

		if (!this._eventListeners) {
			this._eventListeners = {};
		}

		if (!(type in this._eventListeners)) {
			this._eventListeners[type] = [];
		}

		this._eventListeners[type].push(listener);
	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.EventDispatcher
	 * @param type
	 * @param lisntener
	 */
	EventDispatcher.prototype.removeEventListener = function(type, lisntener) {
		if (!this.hasEventListener(type, listener)) {
			return;
		}

		var l = this._eventListeners[type];

		for ( var i = 0, count = l.length; i < count; i++) {
			if (l[i] === listener) {
				l.splice(i, 1);
				return;
			}
		}

	};

	/**
	 * @memberOf h5.ui.components.graph.primitive.EventDispatcher
	 * @param event
	 */
	EventDispatcher.prototype.dispatchEvent = function(event) {
		if (!this._eventListeners) {
			return;
		}
		var l = this._eventListeners[event.type];
		if (!l) {
			return;
		}

		if (!event.target) {
			event.target = this._eventTarget ? this._eventTarget : this;
		}

		for ( var i = 0, count = l.length; i < count; i++) {
			l[i].call(event.target, event);
		}
	};

	/**
	 * オブジェクトプロキシ
	 */
	function createDataItemProxy(obj) {
		if (typeof obj != 'object') {
			// typeofによる判定は簡易なものだが、$.isPlainObjectだと
			// プロトタイプチェーンを持つオブジェクトの判定結果がfalseになるためここでは使用しない
			throw new Error('引数にはObjectを指定してください。');
		}

		var schema = obj.getModel().schema;

		var proxyValue = {};

		return {
			original : obj,
			get : function() {
				if (arguments.length === 0) {
					var retValues = obj.get();
					$.extend(retValues, proxyValue);
					return retValues;
				} else {
					var key = arguments[0];
					if (key in schema) {
						return obj.get(key);
					} else {
						return proxyValue[key];
					}
				}
			},

			set : function() {
				if (arguments.length === 2) {
					var key = arguments[0];
					var value = arguments[1];
					if (key in schema) {
						var orgValue = obj.set.call(obj, key, value);
					} else {
						proxyValue[key] = value;
					}
					return;
				}

				// オリジナルのスキーマが持つプロパティはオリジナルにsetし、持たないものはプロキシが受け取る
				var forOrig = {};
				for ( var prop in schema) {
					if (prop in obj) {
						forOrig[prop] = obj[prop];
					} else {
						proxyValue[prop] = obj[prop];
					}
				}

				obj.set.apply(obj, forOrig);
			}
		};
	}

	/**
	 * @class
	 * @name GraphData
	 */
	function GraphData() {
		this._nodeModel = null;
		this._edgeModel = null;

		this._fromNodeIdKey = 'from';
		this._toNodeIdKey = 'to';

		/*
		 * ノードIDをキー、{ from: [edges], to: [edges] } というオブジェクトを値とするオブジェクト
		 */
		this._relatedEdges = {};

		var that = this;

		this._nodeModel_itemsChangeListener = function(event) {
			that._handleNodeItemsChange(event);
		}

		this._edgeModel_itemsChangeListener = function(event) {
			that._handleEdgeItemsChange(event);
		}
	}

	GraphData.prototype = new EventDispatcher();
	$.extend(GraphData.prototype, {
		getNodeModel : function() {
			return this._nodeModel;
		},

		/**
		 * @memberOf GraphData
		 */
		setNodeModel : function(nodeModel) {
			if (this._nodeModel) {
				this._nodeModel.removeEventListener('itemsChange',
						this._nodeModel_itemsChangeListener);
			}

			this._nodeModel = nodeModel;

			if (nodeModel) {
				nodeModel.addEventListener('itemsChange',
						this._nodeModel_itemsChangeListener);
			}
		},

		getEdgeModel : function() {
			return this._edgeModel;
		},

		setEdgeModel : function(edgeModel) {
			if (this._edgeModel) {
				this._edgeModel.removeEventListener('itemsChange',
						this._edgeModel_itemsChangeListener);
			}

			this._edgeModel = edgeModel;

			if (edgeModel) {
				edgeModel.addEventListener('itemsChange',
						this._edgeModel_itemsChangeListener);
			}
		},

		setFromNodeIdKey : function(key) {
			this._fromNodeIdKey = key;
		},

		setToNodeIdKey : function(key) {
			this._toNodeIdKey = key;
		},

		getEndpointNodeId : function(edgeId) {
			var e = this._edgeModel.get(edgeId);

			if (!e) {
				return null;
			}

			return {
				fromId : e.get(this._fromNodeIdKey),
				toId : e.get(this._toNodeIdKey)
			};
		},

		getRelatedEdges : function(nodeId) {
			if (!(nodeId in this._relatedEdges)) {
				return null;
			}
			return this._relatedEdges[nodeId];
		},

		removeRelatedEdges : function(nodeId) {
			var edges = this.getRelatedEdges(nodeId);
			if (!edges) {
				return;
			}

			var edgeArray;
			if (!edges.from) {
				edgeArray = edges.to;
			} else if (!edges.to) {
				edgeArray = edges.from;
			} else {
				edgeArray = edges.from.concat(edges.to);
			}

			for ( var i = edgeArray.length - 1; i >= 0; i--) {
				this._edgeModel.remove(edgeArray[i]);
			}
		},

		_handleNodeItemsChange : function(event) {
			var created = event.created;
			for ( var i = 0, len = created.length; i < len; i++) {
				this._addNode(created[i]);
			}

			var changed = event.changed;
			for ( var i = 0, len = changed.length; i < len; i++) {
				this._changeNode(changed[i]);
			}

			var removed = event.removed;
			for ( var i = 0, len = removed.length; i < len; i++) {
				this._removeNode(removed[i]);
			}
		},

		_handleEdgeItemsChange : function(event) {
			var created = event.created;
			for ( var i = 0, len = created.length; i < len; i++) {
				this._addEdge(created[i]);
			}

			var removed = event.removed;
			for ( var i = 0, len = removed.length; i < len; i++) {
				this._removeEdge(removed[i]);
			}
		},

		_addNode : function(node) {
			var ev = {
				type : 'nodeAdd',
				node : node
			};
			this.dispatchEvent(ev);
		},

		_changeNode : function(event) {
			var ev = {
				type : 'nodeChange',
				node : event.target,
				props : event.props
			};
			this.dispatchEvent(ev);
		},

		_removeNode : function(node) {
			var ev = {
				type : 'nodeRemove',
				node : node
			};
			this.dispatchEvent(ev);
		},

		_addEdge : function(edge) {
			var fromNodeId = edge.get(this._fromNodeIdKey);
			if (!this._relatedEdges[fromNodeId]) {
				this._relatedEdges[fromNodeId] = {};
			}
			if (!this._relatedEdges[fromNodeId].from) {
				this._relatedEdges[fromNodeId].from = [];
			}
			this._relatedEdges[fromNodeId].from.push(edge);

			var toNodeId = edge.get(this._toNodeIdKey);
			if (!this._relatedEdges[toNodeId]) {
				this._relatedEdges[toNodeId] = {};
			}
			if (!this._relatedEdges[toNodeId].to) {
				this._relatedEdges[toNodeId].to = [];
			}
			this._relatedEdges[toNodeId].to.push(edge);

			var ev = {
				type : 'edgeAdd',
				edge : edge
			};
			this.dispatchEvent(ev);
		},

		_removeEdge : function(edge) {
			var edgeIdKey = this._edgeModel._idKey;

			var removingEdgeId = edge.get(edgeIdKey);

			var fromNodeId = edge.get(this._fromNodeIdKey);
			var fromEdges = this._relatedEdges[fromNodeId].from;
			for ( var i = 0, count = fromEdges.length; i < count; i++) {
				if (fromEdges[i].get(edgeIdKey) == removingEdgeId) {
					fromEdges.splice(i, 1);
					break;
				}
			}

			var toNodeId = edge.get(this._toNodeIdKey);
			var toEdges = this._relatedEdges[toNodeId].to;
			for ( var i = 0, count = toEdges.length; i < count; i++) {
				if (toEdges[i].get(edgeIdKey) == removingEdgeId) {
					toEdges.splice(i, 1);
					break;
				}
			}

			var ev = {
				type : 'edgeRemove',
				edge : edge
			};
			this.dispatchEvent(ev);
		}
	});

	function createGraphData() {
		return new GraphData();
	}

	h5.u.obj.expose('h5.ui.components.graph.primitive', {
		RendererQueue : RendererQueue
	});

	h5.u.obj.expose('h5.ui.components.graph.model', {
		ObjectPool : ObjectPool,
		createGraphData : createGraphData
	});

	/* -------------------------------------------------------------------- */

	// TODO jquery.svgを使う、あるいは汎用ヘルパー関数にする
	function createSvgElement(tagName, attributes) {
		var element = document.createElementNS('http://www.w3.org/2000/svg',
				tagName);

		if (attributes === undefined) {
			return element;
		}

		for ( var attr in attributes) {
			element.setAttribute(attr, attributes[attr]);
		}
		return element;
	}

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

	/**
	 * オブジェクトのキーを列挙し、配列で返します。
	 */
	function enumKeys(obj) {
		// TODO
		// Object.keys()の方が、プロパティ数が多い場合には、for-inループより（hasOwnPropertyのチェックをしていなくても）高速
		return Object.keys(obj);
	}

	var RENDERER_QUEUE_IMMEDIATE = h5.ui.components.graph.primitive.RendererQueue.IMMEDIATE;

	var defaultLayerRenderer = [ {
		name : 'div',
		type : 'div'
	} ];

	var DEFAULT_TYPICAL_NODE_WIDTH = 50;
	var DEFAULT_TYPICAL_NODE_HEIGHT = 100;
	var DEFAULT_NODE_CLASSNAME = "default_node";

	var defaultNodeRenderer = {
		/**
		 * デフォルトのノードのサイズ
		 */
		typicalSize : {
			width : DEFAULT_TYPICAL_NODE_WIDTH,
			height : DEFAULT_TYPICAL_NODE_HEIGHT
		},

		/**
		 * ノードの揃え位置を返します。
		 *
		 * @returns "r" 右揃え、 "l" 左揃え、 "c" 中央揃え
		 */
		getAlignment : function(context) {
			var nodeValue = context.vnode.get();
			return nodeValue.alignment;
		},

		/**
		 * ノードのレイアウト座標を返します。
		 *
		 * @param vnode
		 * @returns {Object} x,yプロパティをからなるノードのレイアウト座標
		 */
		getLayoutPos : function(context) {
			return {
				x : context.node.get('x'),
				y : context.node.get('y')
			};
		},

		/**
		 * ノードのビューを返します。
		 *
		 * @returns {Object} レイヤ名をキー名、DOM要素を値としたオブジェクト
		 */
		createView : function(context) {
			var div = document.createElement('div');
			$(div).addClass(DEFAULT_NODE_CLASSNAME);
			return {
				div : div
			};
		},

		/**
		 * ノードの振る舞いを記述します。
		 */
		behavior : {
			onbind : function(context) {
				var nodeValue = context.vnode.get(); // ノードの値を一旦ただのオブジェクトとして取得
				var view = context.view;
				var str = nodeValue.id;
				if (str.length >= 19) {
					str = str.substring(0, 18) + "...";
				}
				$(view.div).html(str);
			},

			onunbind : function(context) {
				$(context.view.div).html("");
			},

			ondataupdate : function(context) {
			},
		}
	}

	var DEFAULT_EDGE_STYRE_PROPERTY = {
		round : {
			radius : 5
		},
		arrow : {
			lineLength : 10,
			arrowStyle : 'nofilled'
		}
	};

	var DEFAULT_ERROR_VALUE = 0.1;
	var formatStr = h5.u.str.format;
	/***************************************************************************
	 * @name DefaultEdgeRenderer
	 **************************************************************************/
	var defaultEdgeRenderer = {

		/**
		 * [0]はメインの線、[1]は矢尻の進行方向左の線、[2]は進行方向右の線
		 *
		 * @memberOf ___anonymous25997_26837
		 * @param hasArrowhead
		 * @returns エッジのビューノード
		 */
		createView : function(context) {
			var g = createSvgElement('g');

			var mainLine = createSvgElement('path', {
				class : 'edge',
				d : "M 0 0"
			});
			g.appendChild(mainLine);

			var startArrow = createSvgElement('path', {
				class : 'edge fromPointArrow',
				display : 'none'
			});
			g.appendChild(startArrow);
			var endArrow = createSvgElement('path', {
				class : 'edge endPointArrow',
				display : 'none'
			});
			g.appendChild(endArrow);

			var startRound = createSvgElement('circle', {
				class : 'edge fromPointCircle',
				cx : '0',
				cy : '0',
				r : DEFAULT_EDGE_STYRE_PROPERTY.round.radius,
				display : 'none'
			});
			g.appendChild(startRound);
			var endRound = createSvgElement('circle', {
				class : 'edge endPointCircle',
				cx : '0',
				cy : '0',
				r : DEFAULT_EDGE_STYRE_PROPERTY.round.radius,
				display : 'none'
			});
			g.appendChild(endRound);

			var startDiamond = createSvgElement('path', {
				class : 'edge fromPointDiamond',
				display : 'none'
			});
			g.appendChild(startDiamond);
			var endDiamond = createSvgElement('path', {
				class : 'edge endPointDiamond',
				display : 'none'
			});
			g.appendChild(endDiamond);

			var startRect = createSvgElement('path', {
				class : 'edge fromPointRect',
				display : 'none'
			});
			g.appendChild(startRect);
			var endRect = createSvgElement('path', {
				class : 'edge endPointRect',
				display : 'none'
			});
			g.appendChild(endRect);

			return g;
		},

		behavior : {
			/**
			 *
			 */
			_edgeTypeMap : {
				circle : function(context) {
					var circle;
					var center;
					if (context.isFrom) {
						circle = context.view.childNodes[3];
						center = context.through[0];
					} else {
						circle = context.view.childNodes[4];
						center = context.through[context.through.length - 1];
					}
					$(circle).attr({
						cx : center.x,
						cy : center.y,
						display : 'inline'
					});
				},
				circleFill : function(context) {
					var circle;
					if (context.isFrom) {
						circle = context.view.childNodes[3];
					} else {
						circle = context.view.childNodes[4];
					}
					this._edgeTypeMap['circle'].call(this, context);
					this._addClass(circle, 'fill')
				},
				arrowhead : function(context) {
					var endArrow;
					if (context.isFrom) {
						endArrow = context.view.childNodes[1];
					} else {
						endArrow = context.view.childNodes[2];
					}
					var lastIndex = context.through.length - 1;
					var path = context.through;

					var sin;
					if (context.lineLen !== 0) {
						if (path.length === 2) {
							sin = context.vy / context.lineLen;
						} else {
							var baseLen = 0;
							if (context.isFrom) {
								baseLen = this._calcEuclideanDist(path[0],
										path[1]);
								sin = (path[1].y - path[0].y) / baseLen;
								context.vx = path[1].x - path[0].x;
							} else {
								for ( var idx = path.length - 1; baseLen === 0
										&& idx > 0; idx--) {
									baseLen = this._calcEuclideanDist(
											path[lastIndex], path[idx - 1]);
								}
								sin = (path[lastIndex].y - path[lastIndex - 1].y)
										/ baseLen;
								context.vx = path[lastIndex].x
										- path[lastIndex - 1].x;
							}
						}
					} else {
						sin = context.vy
								/ this._calcEuclideanDist(
										context.fromNode.layoutPos,
										context.toNode.layoutPos);
					}
					var th = (context.vx > 0) ? Math.asin(sin) + Math.PI
							: -Math.asin(sin);

					var arrowPoint;
					if (path.length >= 2
							|| context.visibleEdgeLen < DEFAULT_ERROR_VALUE) {
						if (context.isFrom) {
							arrowPoint = {
								x : path[0].x,
								y : path[0].y
							}
						} else {
							arrowPoint = {
								x : path[lastIndex].x,
								y : path[lastIndex].y
							}
						}
					} else {
						arrowPoint = {
							x : path[0].x,
							y : path[0].y
						}
						th = th - Math.PI;
					}

					var len = 10;
					var pi6 = Math.PI / 6;
					var direction = 1;
					if (context.isFrom) {
						direction = -1;
					}
					var hx1 = arrowPoint.x + direction * len
							* Math.cos(th - pi6);
					var hy1 = arrowPoint.y + direction * len
							* Math.sin(th - pi6);
					var hx2 = arrowPoint.x + direction * len
							* Math.cos(th + pi6);
					var hy2 = arrowPoint.y + direction * len
							* Math.sin(th + pi6);

					var propArray = new Array();
					propArray.push(formatStr('M {0} {1}', hx1, hy1));
					propArray.push(formatStr('L {0} {1}', arrowPoint.x,
							arrowPoint.y));
					propArray.push(formatStr('L {0} {1}', hx2, hy2));
					$(endArrow).attr({
						d : propArray.join(" "),
						display : 'inline'
					});
				},
				arrowheadFill : function(context) {
					this._edgeTypeMap['arrowhead'].call(this, context);
					var endArrow;
                    if (context.isFrom) {
                        endArrow = context.view.childNodes[1];
                    } else {
                        endArrow = context.view.childNodes[2];
                    }
					this._addClass(endArrow, 'fill')
				},
				diamond : function(context) {
					var edgeDiamond;
					if (context.isFrom) {
						edgeDiamond = context.view.childNodes[5];
					} else {
						edgeDiamond = context.view.childNodes[6];
					}
					var lastIndex = context.through.length - 1;
					var path = context.through;

					var sin;
					if (context.lineLen !== 0) {
						if (path.length === 2) {
							sin = context.vy / context.lineLen;
						} else {
							var baseLen = 0;
							for ( var idx = path.length - 1; baseLen === 0
									&& idx > 0; idx--) {
								baseLen = this._calcEuclideanDist(
										path[lastIndex], path[idx - 1]);
							}
							sin = (path[lastIndex].y - path[lastIndex - 1].y)
									/ baseLen;
							context.vx = path[lastIndex].x
									- path[lastIndex - 1].x;
						}
					} else {
						sin = context.vy
								/ this._calcEuclideanDist(
										context.fromNode.layoutPos,
										context.toNode.layoutPos);
					}
					var th = (context.vx > 0) ? Math.asin(sin) + Math.PI
							: -Math.asin(sin);

					var arrowPoint;
					if (path.length >= 2
							|| context.visibleEdgeLen < DEFAULT_ERROR_VALUE) {
						if (context.isFrom) {
							arrowPoint = {
								x : path[0].x,
								y : path[0].y
							}
						} else {
							arrowPoint = {
								x : path[lastIndex].x,
								y : path[lastIndex].y
							}
						}
					} else {
						arrowPoint = {
							x : path[0].x,
							y : path[0].y
						}
						th = th - Math.PI;
					}

					var len = 10;
					var pi6 = Math.PI / 6;
					var direction = 1;
					if (context.isFrom) {
						direction = -1
					}
					var hx1 = arrowPoint.x + direction * len
							* Math.cos(th - pi6);
					var hy1 = arrowPoint.y + direction * len
							* Math.sin(th - pi6);
					var hx2 = arrowPoint.x + direction * len
							* Math.cos(th + pi6);
					var hy2 = arrowPoint.y + direction * len
							* Math.sin(th + pi6);

					var propArray = new Array();
					propArray.push(formatStr('M {0} {1}', hx1, hy1));
					propArray.push(formatStr('L {0} {1}', arrowPoint.x,
							arrowPoint.y));
					propArray.push(formatStr('L {0} {1}', hx2, hy2));
					if (context.isFrom) {
						propArray.push(formatStr('L {0} {1}', arrowPoint.x + 2
								* len * Math.cos(th - Math.PI), arrowPoint.y
								+ 2 * len * Math.sin(th - Math.PI)))
					} else {
						propArray.push(formatStr('L {0} {1}', arrowPoint.x - 2
								* len * Math.cos(th - Math.PI), arrowPoint.y
								- 2 * len * Math.sin(th - Math.PI)))
					}
					propArray.push(formatStr('Z'));
					$(edgeDiamond).attr({
						d : propArray.join(" "),
						display : 'inline'
					});
				},
				diamondFill : function(context) {
					this._edgeTypeMap['diamond'].call(this, context);
					var edgeDiamond;
					if (context.isFrom) {
						edgeDiamond = context.view.childNodes[5];
					} else {
						edgeDiamond = context.view.childNodes[6];
					}
					this._addClass(edgeDiamond, 'fill')
				},
				rect : function(context) {
					var edgeDiamond;
					if (context.isFrom) {
						edgeDiamond = context.view.childNodes[7];
					} else {
						edgeDiamond = context.view.childNodes[8];
					}
					var lastIndex = context.through.length - 1;
					var path = context.through;

					var sin;
					if (context.lineLen !== 0) {
						if (path.length === 2) {
							sin = context.vy / context.lineLen;
						} else {
							var baseLen = 0;
							for ( var idx = path.length - 1; baseLen === 0
									&& idx > 0; idx--) {
								baseLen = this._calcEuclideanDist(
										path[lastIndex], path[idx - 1]);
							}
							sin = (path[lastIndex].y - path[lastIndex - 1].y)
									/ baseLen;
							context.vx = path[lastIndex].x
									- path[lastIndex - 1].x;
						}
					} else {
						sin = context.vy
								/ this._calcEuclideanDist(
										context.fromNode.layoutPos,
										context.toNode.layoutPos);
					}
					var th = (context.vx > 0) ? Math.asin(sin) + Math.PI
							: -Math.asin(sin);

					var arrowPoint;
					if (path.length >= 2
							|| context.visibleEdgeLen < DEFAULT_ERROR_VALUE) {
						if (context.isFrom) {
							arrowPoint = {
								x : path[0].x,
								y : path[0].y
							}
						} else {
							arrowPoint = {
								x : path[lastIndex].x,
								y : path[lastIndex].y
							}
						}
					} else {
						arrowPoint = {
							x : path[0].x,
							y : path[0].y
						}
						th = th - Math.PI;
					}

					var len = 10;
					var pi2 = Math.PI / 2;
					var direction = 1;
					if (context.isFrom) {
						direction = -1
					}

					var v1 = {
						x : arrowPoint.x + direction * (len / 2)
								* Math.cos(th - pi2),
						y : arrowPoint.y + direction * (len / 2)
								* Math.sin(th - pi2)
					};
					var v2 = {
						x : arrowPoint.x + direction * (len / 2)
								* Math.cos(th + pi2),
						y : arrowPoint.y + direction * (len / 2)
								* Math.sin(th + pi2)
					};
					var v3 = {
						x : arrowPoint.x + direction * len * Math.cos(th)
								+ direction * (len / 2) * Math.cos(th + pi2),
						y : arrowPoint.y + direction * len * Math.sin(th)
								+ direction * (len / 2) * Math.sin(th + pi2)
					};
					var v4 = {
						x : arrowPoint.x + direction * len * Math.cos(th)
								+ direction * (len / 2) * Math.cos(th - pi2),
						y : arrowPoint.y + direction * len * Math.sin(th)
								+ direction * (len / 2) * Math.sin(th - pi2)
					};

					var propArray = new Array();
					propArray.push(formatStr('M {0} {1}', v1.x, v1.y));
					propArray.push(formatStr('L {0} {1}', v2.x, v2.y));
					propArray.push(formatStr('L {0} {1}', v3.x, v3.y));
					propArray.push(formatStr('L {0} {1}', v4.x, v4.y));
					propArray.push(formatStr('Z'));
					$(edgeDiamond).attr({
						d : propArray.join(" "),
						display : 'inline'
					});
				},
				rectFill : function(context) {
					this._edgeTypeMap['rect'].call(this, context);
					var edgeRect;
					if (context.isFrom) {
						edgeRect = context.view.childNodes[7];
					} else {
						edgeRect = context.view.childNodes[8];
					}
					this._addClass(edgeRect, 'fill')
				}
			},

			_addClass : function(object, className) {
				var currentClass = $(object).attr('class');
				var classArray = currentClass.split(" ");
				var flag = true;
				for ( var j = 0, len = classArray.length; j < len; j++) {
					if (classArray[j] === className) {
						flag = false;
						break;
					}
				}
				if (flag) {
					classArray.push(className);
				}
				$(object).attr('class', classArray.join(" "));

			},

			/**
			 * 注目してるノード(focusNode)が、注目しているエッジと交わる点の座標を計算する。
			 *
			 * @returns エッジと端点ノードが交わる点
			 */
			_getCrossPos : function(focusNodeCenter, focusNodeSize,
					oppositNodeCenter) {
				// エッジと座標軸との角度の計算
				var vx = focusNodeCenter.x - oppositNodeCenter.x;
				var vy = focusNodeCenter.y - oppositNodeCenter.y;
				var lineLen = Math
						.pow((Math.pow(vx, 2) + Math.pow(vy, 2)), 0.5);
				var sin = vy / lineLen;

				// ノードの対角線と座標軸との角度の計算
				var diagonalHeight = focusNodeSize.height / 2;
				var diagonalLen = Math.pow((Math.pow((focusNodeSize.width / 2),
						2) + Math.pow(diagonalHeight, 2)), 0.5);
				var diagonalSin = diagonalHeight / diagonalLen;

				// ノードの外周とエッジとの交点の座標値の計算
				var x;
				var y;
				var tan = Math.pow((Math.pow(sin, 2) / (1 - Math.pow(sin, 2))),
						0.5);
				if (Math.abs(sin) > diagonalSin) { // ノードの上面か下面に交点ができる
					if (vy < 0) { // 下面に交点がある
						y = focusNodeCenter.y + diagonalHeight;
					} else { // 上面に交点がある
						y = focusNodeCenter.y - diagonalHeight;
					}
					if (vx < 0) { // 第1,4象限に交点ができる
						x = focusNodeCenter.x + (diagonalHeight / tan);
					} else { // 第2,3象限に交点ができる
						x = focusNodeCenter.x - (diagonalHeight / tan);
					}
				} else { // ノードの右面か左面に交点ができる
					if (vx > 0) { // 左面に交点ができる
						x = focusNodeCenter.x - (focusNodeSize.width / 2);
					} else { // 右面に交点ができる
						x = focusNodeCenter.x + (focusNodeSize.width / 2);
					}
					if (vy < 0) {
						y = focusNodeCenter.y
								+ ((focusNodeSize.width / 2) * tan);
					} else {
						y = focusNodeCenter.y
								- ((focusNodeSize.width / 2) * tan);
					}
				}

				return {
					x : x,
					y : y
				}
			},
			/**
			 * 二つの座標の距離を計算する
			 *
			 * @returns 指定した二つの座標のユークリッド距離
			 */
			_calcEuclideanDist : function(point1, point2) {
				return Math.pow((Math.pow(point1.x - point2.x, 2) + Math.pow(
						point1.y - point2.y, 2)), 0.5);
			},

			/**
			 * 指定したノードの中心の座標を計算する
			 *
			 * @returns ノードの中心の座標
			 */
			_getNodeCenterPos : function(node, nodeSize) {
				return {
					x : node.layoutPos.x + (nodeSize.width / 2),
					y : node.layoutPos.y + (nodeSize.height / 2)
				}
			},

			_getNodeSize : function(controller, nodeId) {
				var nodeSize = controller.getNodeSize(nodeId);
				if (!nodeSize) {
					nodeSize = controller.getNodeRenderer().typicalSize;
				}
				return nodeSize;
			},

			_createLoopPath : function(node, nodeSize) {
				var path = new Array();
				path.push({
					x : node.x + (nodeSize.width / 2) + 10,
					y : node.y
				});
				path.push({
					x : node.x + (nodeSize.width / 2) + 10,
					y : node.y - (nodeSize.height / 2) - 10
				});
				path.push({
					x : node.x,
					y : node.y - (nodeSize.height / 2) - 10
				});

				return path;
			},

			_getShiftSide : function (nodeSize, side) {
				if (side === "left") {
					return -(nodeSize.width / 2);
				} else if (side === "right") {
					return nodeSize.width / 2
				} else {
					return 0;
				}
			},

			_getShiftHeith : function (nodeSize, height) {
				if (height === "upper") {
					return -(nodeSize.height / 2);
				} else if (height === "bottom") {
					return nodeSize.height / 2;
				} else {
					return 0;
				}
			},

			_analyzeAlign : function (str) {
				var subStr = str.substring(0, 2);
				var side;
				if (subStr.indexOf('l') >= 0) {
					side = "left";
				} else if (subStr.indexOf('c') >= 0) {
					side = "center";
				} else if (subStr.indexOf('r') >= 0) {
					side = "right";
				}

				var height;
				if (subStr.indexOf('u') >= 0) {
					height = "upper";
				} else if (subStr.indexOf('m') >= 0) {
					height = "middle";
				} else if (subStr.indexOf('b') >= 0) {
					height = "bottom";
				}

				return {
					side : side,
					height : height
				}
			},

			onbind : function(context) {
				var renderController = context.controller;
				var fromNode = context.fromVnode;
				var toNode = context.toVnode;
				var view = context.view;
				var vedge = context.vedge;
				// ノードがないならエッジも描画しない
				if (!toNode || !fromNode) {
					return;
				}
				var isSameNode = false;
				if (fromNode.id === toNode.id) {
					isSameNode = true;
				}

				// エッジの先頭点から終端点までの配列
				var path = null;
				var through = vedge.get('through');
				if (through || through !== null || through !== undefined) {
					path = Array.apply(null, through);
				} else {
					path = new Array();
				}

				var fromNodeSize = this._getNodeSize(renderController,
						fromNode.id);
				var toNodeSize = this._getNodeSize(renderController, toNode.id);

				var fromNodeCenter = this._getNodeCenterPos(fromNode,
						fromNodeSize);
				var toNodeCenter = this._getNodeCenterPos(toNode, toNodeSize);

				// 違うノードで、座標が完全に一致している場合は、何も表示しない
				if (!isSameNode && toNodeCenter.x === fromNodeCenter.x
						&& toNodeCenter.y === fromNodeCenter.y) {
					return;
				}

				if (path.length === 0) {
					if (isSameNode) {
						path = this._createLoopPath(fromNodeCenter,
								fromNodeSize);
						var secondPoint = path[0];
						var lastPoint = path[2];
					} else {
						var secondPoint = toNodeCenter;
						var lastPoint = fromNodeCenter;
					}
				} else {
					var secondPoint = through[0];
					var lastPoint = through[through.length - 1];
				}

				var fromParam = vedge.get('paramFrom');
				var start = {x:0, y:0};
				if (!fromParam || !fromParam.position) {
					start = this._getCrossPos(fromNodeCenter, fromNodeSize,
								secondPoint);
				} else {
					var fromPointPos;
					if (fromParam.position) {
						fromPointPos = this._analyzeAlign(fromParam.position);
					}
					if (fromPointPos.side) {
						start.x = fromNodeCenter.x + this._getShiftSide(fromNodeSize, fromPointPos.side);
						if (fromPointPos.height) {
							start.y = fromNodeCenter.y + this._getShiftHeith(fromNodeSize, fromPointPos.height);
						} else {
							start.y = fromNodeCenter.y;
						}
					} else if (fromPointPos.height) {
						start.x = fromNodeCenter.x;
						start.y = fromNodeCenter.y + this._getShiftHeith(fromNodeSize, fromPointPos.height);
					}
				}

				var toParam = vedge.get('paramTo');
				var end = {x:0, y:0};
				if (!toParam || !toParam.position) {
					end = this._getCrossPos(toNodeCenter, toNodeSize, lastPoint);
				} else {
					var toPointPos;
					if (toParam.position) {
						toPointPos = this._analyzeAlign(toParam.position);
					}
					if (toPointPos.side) {
						end.x = toNodeCenter.x + this._getShiftSide(toNodeSize, toPointPos.side);
						if (toPointPos.height) {
							end.y = toNodeCenter.y + this._getShiftHeith(toNodeSize, toPointPos.height);
						} else {
							end.y = toNodeCenter.y;
						}
					} else if (toPointPos.height) {
						end.x = toNodeCenter.x;
						end.y = toNodeCenter.y + this._getShiftHeith(toNodeSize, toPointPos.height);
					}
				}
				// ここでエッジの先頭点から終端点までの配列が完成
				path.unshift(start);
				path.push(end);

				var vx = end.x - start.x;
				var vy = end.y - start.y;

				var lineLen = 0;
				for ( var i = 0, len = path.length - 1; i < len; i++) {
					lineLen += this._calcEuclideanDist(path[i + 1], path[i]);
				}

				var fromNodeInnerLen = this._calcEuclideanDist(fromNodeCenter,
						start);
				var toNodeInnerLen = this._calcEuclideanDist(end, toNodeCenter);
				var nodeDist = this._calcEuclideanDist(fromNodeCenter,
						toNodeCenter);

				var visibleEdgeLen = Math.abs(lineLen + fromNodeInnerLen
						+ toNodeInnerLen - nodeDist);

				if (toParam) {
					var shapeTo = toParam.shape;
					if (shapeTo && this._edgeTypeMap[shapeTo]) {
						// Mapから取り出して、指定されたものを実施
						this._edgeTypeMap[shapeTo].call(this, {
							view : view,
							through : path,
							isFrom : false,
							visibleEdgeLen : visibleEdgeLen,
							lineLen : lineLen,
							vx : vx,
							vy : vy,
							fromNode : fromNode,
							toNode : toNode
						});
					} else {
						// デフォルトの矢尻を設定
						this._edgeTypeMap["arrowhead"].call(this, {
							view : view,
							through : path,
							isFrom : false,
							visibleEdgeLen : visibleEdgeLen,
							lineLen : lineLen,
							vx : vx,
							vy : vy,
							fromNode : fromNode,
							toNode : toNode
						});
					}
				}

				if (fromParam) {
					var shapeFrom = fromParam.shape;
					if (shapeFrom && this._edgeTypeMap[shapeFrom]) {
						// Mapから取り出して、処理を行う
						this._edgeTypeMap[shapeFrom].call(this, {
							view : view,
							through : path,
							isFrom : true,
							visibleEdgeLen : visibleEdgeLen,
							lineLen : lineLen,
							vx : vx,
							vy : vy,
							fromNode : fromNode,
							toNode : toNode
						});
					}// デフォルトではエッジの元は何もセットしない
				}

				// エッジのメイン部分を作成
				var mainLine = view.childNodes[0];
				if (path != null || visibleEdgeLen < DEFAULT_ERROR_VALUE
						|| isSameNode) {
					var propArray = new Array();
					propArray.push(formatStr('M {0} {1}', start.x, start.y));
					if (path.length > 2) {
						for ( var i = 1, len = path.length - 1; i < len; i++) {
							propArray.push(formatStr('L {0} {1}', path[i].x,
									path[i].y));
						}
						var point2end = this._calcEuclideanDist(path[i - 1],
								end);
						var point2center = this._calcEuclideanDist(path[i - 1],
								toNodeCenter);
						if ((toParam && toParam.position) || point2end <= point2center) {
							propArray
									.push(formatStr('L {0} {1}', end.x, end.y));
						}
					} else {
						propArray.push(formatStr('L {0} {1}', end.x, end.y));
					}
					mainLine.setAttribute('d', propArray.join(" "));
				} else {
					mainLine.setAttribute('d', "M 0 0");
				}

				var customClass = vedge.get('customClass');
				if (customClass) {
					for ( var i = 0, len = context.view.childNodes.length; i < len; i++) {
						this._addClass(context.view.childNodes[i], customClass)
					}
				}
			},

			onunbind : function(context) {
				var mainLine = context.view.childNodes[0];
				mainLine.setAttribute('d', "M 0 0");
				mainLine.setAttribute('class', 'edge');

				var startPath = context.view.childNodes[1];
				startPath.setAttribute('class', 'edge fromPointArrow');
				startPath.setAttribute('display', 'none');

				var endPath = context.view.childNodes[2];
				endPath.setAttribute('class', 'edge endPointArrow');
				endPath.setAttribute('display', 'none');

				var startCircle = context.view.childNodes[3];
				startCircle.setAttribute('class', 'edge fromPointCircle');
				startCircle.setAttribute('display', 'none');

				var endCircle = context.view.childNodes[4];
				endCircle.setAttribute('class', 'edge endPointCircle');
				endCircle.setAttribute('display', 'none');

				var startDiamond = context.view.childNodes[5];
				startCircle.setAttribute('class', 'edge fromPointDiamond');
				startCircle.setAttribute('display', 'none');

				var endDiamond = context.view.childNodes[6];
				endCircle.setAttribute('class', 'edge endPointDiamond');
				endCircle.setAttribute('display', 'none');

				var startRect = context.view.childNodes[7];
				startCircle.setAttribute('class', 'edge fromPointRect');
				startCircle.setAttribute('display', 'none');

				var endRect = context.view.childNodes[8];
				endCircle.setAttribute('class', 'edge endPointRect');
				endCircle.setAttribute('display', 'none');
			},

			onnodemove : function(context) {
				this.onbind(context);
			}

		}
	};

	/***************************************************************************
	 * @name h5.ui.components.graph.GraphController
	 * @namespace
	 **************************************************************************/
	var graphRenderController = {
		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		__name : 'h5.ui.components.graph.GraphController',

		/**
		 * グラフの描画（可視）領域のサイズが変更されたときに発生するイベント。
		 * 可視領域サイズベースなので、DOM要素の大きさが変わらなくても、setScale()等で 拡大率が変更された場合にもイベントが発生する。
		 *
		 */
		EVENT_RESIZE : 'graphResize',

		/**
		 * 描画領域がスクロールした場合に発生するイベント。 ユーザー操作によるスクロールに加え、scrollTo, scrollBy,
		 * setScaleなどのメソッド呼び出しによる スクロール処理の場合も発生する。
		 */
		EVENT_SCROLL : 'graphScroll',

		/**
		 * setScale()によって拡大率が変更されたときに発生するイベント。
		 */
		EVENT_SCALE : 'graphScale',

		/**
		 * ノードの移動時に発生するイベント。
		 */
		EVENT_NODE_MOVE : 'nodeMove',

		EVENT_NODE_DRAG_BEGIN : 'nodeDragBegin',

		EVENT_NODE_DRAG_END : 'nodeDragEnd',

		/**
		 * ノードをクリックした
		 */
		EVENT_NODE_CLICK : 'nodeClick',

		EVENT_NODE_DBLCLICK : 'nodeDblclick',

		/**
		 * エッジをクリックした
		 */
		EVENT_EDGE_CLICK : 'edgeClick',

		EVENT_EDGE_DBLCLICK : 'edgeDblclick',

		EVENT_NODE_ENTER : 'nodeEnter',

		EVENT_NODE_LEAVE : 'nodeLeave',

		EVENT_EDGE_ENTER : 'edgeEnter',

		EVENT_EDGE_LEAVE : 'edgeLeave',

		EVENT_NODE_SELECT : 'nodeSelect',

		EVENT_NODE_UNSELECT : 'nodeUnselect',

		_MAX_COMMAND_PER_LOOP : 200,

		_LAYER_SCROLL_MODE_NONE : 0,
		_LAYER_SCROLL_MODE_X : 1,
		_LAYER_SCROLL_MODE_Y : 2,
		_LAYER_SCROLL_MODE_XY : 3,

		_LAYER_NAME_EDGE : 'internalEdgeLayer',

		_PREPROCESS_EVENT_NAMES : [ 'mousedown', 'mousemove', 'mouseup',
				'mousewheel', 'touchstart', 'touchmove', 'touchend',
				'touchcancel' ],

		/**
		 * trueにすると、ユーザー操作でグラフ全体がスクロールできるようになります。 デフォルトはtrueです。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		isEnableScreenDrag : true,

		/**
		 * trueにすると、ユーザー操作で特定のノードを選んでスクロールできるようになります。 デフォルトはtrueです。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		isEnableNodeDrag : true,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_root : null,

		/**
		 * { (レイヤ名): (ルートエレメント) } が入っている
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_layerRootElementMap : {},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_edgeLayerElement : null,

		_edgeLayerScrollMode : 3,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_layerRenderers : null,

		/**
		 * createView(Function), getLayoutPos(Function), behavior(Object)を持つ
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_nodeRenderer : null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_nodeViewPool : null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_nodeBehaviorPool : null,

		/**
		 * createView(Function), behavior(Object)を持つ
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_edgeRenderer : null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_edgeViewPool : null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_edgeBehaviorPool : null,

		// TODO Node:Viewをm:n (m:1でよい？？)にできるようにする
		// nodeToViewMappingFunction: null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_rendererQueue : null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_vnodes : {},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_vedges : {},

		/**
		 * 表示領域の物理サイズ
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_rootSize : null, // _setRootでセット

		/**
		 * 表示領域の論理サイズ。 _rootSizeとは異なり、拡大率(scale)の影響を考慮する。
		 */
		_visibleLayoutRect : {
			x : 0,
			y : 0,
			width : 0,
			height : 0,
			scale : 1
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_nodeSortArray : null,

		/**
		 * キー：ノードID、値：{node: vnode, view: nodeView, behavior: behavior} なオブジェクト
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_visibleNodes : null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_visibleEdges : null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_showDirection : true,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_graph : null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_delegateHandlerMap : {},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_requestAnimationFrame : null,

		_nodeIdKey : null,

		_edgeIdKey : null,

		_callbackData : {},

		/**
		 * UpdateViewの実処理を行う必要があるかどうか。
		 * updateViewが呼ばれるとtrueになり、_updateViewで実際にアップデートされるとfalseになる。<br>
		 * TODO 処理キューの仕組みを入れるとキューの操作で解決できるかもしれないが、ひとまずこれで対応。
		 */
		_isUpdateViewPending : false,

		_isDrawEdgesPending : false,

		_reservedFuncArray : [],

		_lastGestureScale : 1,

		_dragMode : DRAG_MODE_NONE,

		/**
		 * ドラッグ完了後のclickイベントでノードのselect/unselectの挙動を制御するためのフラグ
		 * (clickハンドラ内で必ずfalseにセットされる)
		 */
		_isDragged : false,

		_dragTargetNode : null,

		/**
		 * 前回のマウスイベントでのマウスポジション。clientXY基準。
		 * screenXYを使うと、WebDriverでのテスト時に値がゼロになってしまうので使用しない。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_lastMousePosition : null,

		/**
		 * ドラッグ選択モード中、最後のドラッグで選択されたノードリスト。
		 * ドラッグが完了するとクリアされる。これにより、エクスプローラでshiftを押しながら 選択した時のような挙動になる。
		 */
		_lastSelectedNodes : [],

		/**
		 * ドラッグオーバーレイを削除します。
		 */
		_$dragSelectOverlay : null,

		/**
		 * ドラッグ開始時の座標(クライアント座標)です。
		 */
		_dragStartMousePosition : null,

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_isDragging : false,

		/**
		 * ドラッグ開始時点のノードのレイアウト座標を保持。 { x, y }
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_nodeDragBeginPos : null,

		/**
		 * エッジ付近にカーソルがある場合の自動スクロールタイマー
		 */
		_dragNodeEdgeScrollTimerId : null,

		_isFirstDragMove : false,

		_inited : false,

		_getVnodeById : function(id) {
			return this._vnodes[id];
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		__construct : function(context) {
			this._requestAnimationFrame = (window.requestAnimationFrame
					|| window.webkitRequestAnimationFrame
					|| window.mozRequestAnimationFrame
					|| window.msRequestAnimationFrame
					|| window.oRequestAnimationFrame || (function(
					timeoutCallback) {
				window.setTimeout(timeoutCallback, 0);
			}));

			var Pool = h5.ui.components.graph.model.ObjectPool;
			var that = this;
			this._nodeBehaviorPool = Pool.create(null, function() {
				return $.extend({}, that._nodeRenderer.behavior);
			});

			this._edgeBehaviorPool = Pool.create(null, function() {
				return $.extend({}, that._edgeRenderer.behavior);
			});

			this._nodeViewPool = Pool.create(null, function() {
				return that._nodeRenderer.createView({
					data : that._callbackData
				});
			});

			this._edgeViewPool = Pool.create(null, function(showDirection) {
				// TODO showDirectionをエッジのcreateViewのタイミングで渡されても困る？？
				return that._edgeRenderer.createView({
					showDirection : showDirection,
					data : that._callbackData
				});
			}, [ this._showDirection ]);

			if (!this._edgeRenderer) {
				this._edgeRenderer = defaultEdgeRenderer;
			}

			if (!this._nodeRenderer) {
				this._nodeRenderer = defaultNodeRenderer;
			}

			if (!this._layerRenderers) {
				this._layerRenderers = defaultLayerRenderer;
			}

			new EventDispatcher(this);
			this._rendererQueue = new h5.ui.components.graph.primitive.RendererQueue();

		},

		__init : function(context) {
			this._setRoot(this.rootElement);
			this.init();
		},

		__ready : function(context) {
			this.init();
		},

		init : function() {
			// 必要なパラメータが揃うまでは何もしない
			if (this._inited || !this._graph || !this._nodeRenderer
					|| !this._edgeRenderer || !this._layerRenderers
					|| !this._root) {
				return;
			}

			this._inited = true;

			// TODO 先に既存のビューをクリアする必要がある
			// 一旦クリア
			this._vnodes = {};
			this._vedges = {};

			this._nodeSortArray = [];
			this._visibleNodes = {};
			this._visibleEdges = {};

			var graph = this._graph;

			this._nodeIdKey = graph._nodeModel._idKey;
			this._edgeIdKey = graph._edgeModel._idKey;

			var nodeModel = graph._nodeModel;
			for ( var keys = enumKeys(nodeModel.items), i = 0, count = keys.length; i < count; i++) {
				var vn = this._createVNode(nodeModel.items[keys[i]]);
				this._nodeSortArray.push(vn);
			}

			this._nodeSortArray.sort(nodePositionComparer);

			var edgeModel = graph._edgeModel;
			for ( var keys = enumKeys(edgeModel.items), i = 0, len = keys.length; i < len; i++) {
				this._createVedge(edgeModel.items[keys[i]]);
			}

			// グラフデータの変更を検知するハンドラをgraphにバインド
			this._bindGraphHandlers();

			// レイヤを作成
			this._createLayers();

			// Node,Edgeのビヘイビアのイベントリスナーを登録
			this._registerBehaviorEventDelegates();

			this._bindRootHandlers();

			// 直ちに描画
			this.updateView(true);
		},

		addCallbackData : function(key, value) {
			this._callbackData[key] = value;
		},

		removeCallbackData : function(key) {
			if (key in this._callbackData) {
				delete this._callbackData[key];
			}
		},

		/**
		 * グラフデータをセットします。 初期化処理が行われ、グラフが描画されます。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 * @param graph
		 */
		setGraphData : function(graph) {
			this._graph = graph;
			this.init();
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		setShowDirection : function(showDirection) {
			this._showDirection = showDirection;
		},

		/**
		 * 指定されたidを持つノードが画面に表示されるようにスクロールします。 ノードは画面中央に表示されます。
		 * 指定されたノードが存在しない場合は何も行いません。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 * @param nodeId
		 */
		scrollIntoView : function(nodeId) {
			var vnode = this._vnodes[nodeId];
			if (!vnode) {
				return;
			}

			var x = vnode.layoutPos.x;
			var y = vnode.layoutPos.y;

			this._scrollTo(x, y); // イベントを出さずにスクロール
			this._updateView(); // ノードを可視領域内に持ってきたうえで即時描画（サイズ取得のため）

			var nodeSize = this.getNodeSize(nodeId);

			var cx = vnode.layoutPos.x + (nodeSize.width / 2)
					- (this._visibleLayoutRect.width / 2);

			var cy = vnode.layoutPos.y + (nodeSize.height / 2)
					- (this._visibleLayoutRect.height / 2);

			this.scrollTo(cx, cy); // こちらはイベントを出してスクロール
		},

		/**
		 * ノードの表示上のサイズを返します。
		 */
		getNodeSize : function(nodeId) {
			var visibleNode = this.getNodeView(nodeId);

			if (!visibleNode) {
				return null;
			}

			var nodeView = visibleNode.view;

			var maxW = 0, maxH = 0;

			// TODO drawNodeとコード重複
			for ( var i = 0, count = this._layerRenderers.length; i < count; i++) {
				var renderer = this._layerRenderers[i];
				var layerName = renderer.name;

				var nodeLayerView = nodeView[layerName];

				if (!nodeLayerView) {
					// このレイヤに対応するビューが存在しない場合はスキップ
					// 背景レイヤなどの場合にここに来る
					continue;
				}

				var layerRect = nodeLayerView.getBoundingClientRect();
				maxW = Math.max(maxW, layerRect.width);
				maxH = Math.max(maxH, layerRect.height);
			}

			var scale = this.getScale();

			return {
				width : maxW / scale,
				height : maxH / scale
			};
		},

		getScale : function() {
			return this._visibleLayoutRect.scale;
		},

		/**
		 * 指定された座標が原点（左上）の位置にくるようにグラフ全体をスクロールします。X軸は右が正、Y軸は下が正です。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 * @param x
		 *            {Number} X座標
		 * @param y
		 *            {Number} Y座標
		 */
		scrollTo : function(layoutX, layoutY) {
			var scrollArg = {
				newScrollPos : {
					x : layoutX,
					y : layoutY
				},
				currentScrollPos : {
					x : this._visibleLayoutRect.x,
					y : this._visibleLayoutRect.y
				}
			};
			this.trigger(this.EVENT_SCROLL, scrollArg);
			// TODO isDefaultPreventedチェック

			this._scrollTo(layoutX, layoutY);
		},

		_scrollTo : function(layoutX, layoutY) {
			var oldScrollPos = {
				x : this._visibleLayoutRect.x,
				y : this._visibleLayoutRect.y
			};

			this._visibleLayoutRect.x = layoutX;
			this._visibleLayoutRect.y = layoutY;

			var scrollCtx = {
				controller : this,
				oldScrollPos : oldScrollPos,
				newScrollPos : this._visibleLayoutRect,
				data : this._callbackData,
				size : this._rootSize
			};

			for ( var i = 0, count = this._layerRenderers.length; i < count; i++) {
				var renderer = this._layerRenderers[i];
				var layerName = renderer.name;

				var layerScrMode = this._layerRootElementMap[layerName].scrollMode;

				if (layerScrMode == this._LAYER_SCROLL_MODE_NONE) {
					continue;
				}

				var layerOldScrollPos = {
					x : oldScrollPos.x,
					y : oldScrollPos.y
				};

				var layerNewScrollPos = {
					x : layoutX,
					y : layoutY
				};

				switch (layerScrMode) {
				case this._LAYER_SCROLL_MODE_X:
					layerOldScrollPos.y = 0;
					layerNewScrollPos.y = 0;
					break;
				case this._LAYER_SCROLL_MODE_Y:
					layerOldScrollPos.x = 0;
					layerNewScrollPos.x = 0;
					break;
				// XYモードの場合はx,yどちらも動く
				}

				scrollCtx.layerOldScrollPos = layerOldScrollPos;
				scrollCtx.layerNewScrollPos = layerNewScrollPos;

				var layerElem = this._layerRootElementMap[layerName].rootElement;

				var hasOnscrollFunc = false;
				if (renderer.behavior && renderer.behavior.onscroll) {
					hasOnscrollFunc = true;
				}

				// TODO もう少し整理できそう
				var doDefault = true;
				if (renderer.type == 'svg') {
					if (hasOnscrollFunc) {
						scrollCtx.layerRootElement = layerElem.childNodes[0];
						doDefault = renderer.behavior.onscroll(scrollCtx);
						if (doDefault === undefined) {
							doDefault = true;
						}
					}
					if (doDefault) {
						this._setSvgTransform(layerElem.childNodes[0],
								-layerNewScrollPos.x, -layerNewScrollPos.y);
					}
				} else {
					if (hasOnscrollFunc) {
						scrollCtx.layerRootElement = layerElem;
						doDefault = renderer.behavior.onscroll(scrollCtx);
						if (doDefault === undefined) {
							doDefault = true;
						}
					}
					if (doDefault) {
						this._setDivTransform(layerElem, -layerNewScrollPos.x,
								-layerNewScrollPos.y);
					}
				}
			}

			if (this._edgeLayerScrollMode != this._LAYER_SCROLL_MODE_NONE) {
				var ex = -layoutX;
				var ey = -layoutY;

				switch (this._edgeLayerScrollMode) {
				case this._LAYER_SCROLL_MODE_X:
					ey = 0;
					break;
				case this._LAYER_SCROLL_MODE_Y:
					ex = 0;
					break;
				// XYモードの場合はx,yどちらも動く
				}

				// TODO 仮処理
				this._setSvgTransform(this._edgeLayerElement.childNodes[0], ex,
						ey);
			}

			this.updateView();
		},

		/**
		 * 指定された座標量分だけグラフ全体をスクロールします。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 * @param x
		 *            {Number} スクロールするX座標量
		 * @param y
		 *            {Number} スクロールするY座標量
		 */
		scrollBy : function(layoutX, layoutY) {
			this.scrollTo(this._visibleLayoutRect.x + layoutX,
					this._visibleLayoutRect.y + layoutY);
		},

		/**
		 * 現在の可視領域（レイアウト座標ベース）を取得します。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 * @returns {Object} {x, y, width, height, scale}からなるオブジェクト
		 */
		getVisibleLayoutRect : function() {
			return this._visibleLayoutRect;
		},

		_getLayoutPosFromScreenOffset : function(x, y) {
			var scale = this.getScale();
			var lx = this._visibleLayoutRect.x + x / scale;
			var ly = this._visibleLayoutRect.y + y / scale;
			return {
				x : lx,
				y : ly
			};
		},

		/**
		 * グラフ全体の拡大率を設定します。1の場合に 座標値＝ピクセル座標 となります。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 * @param scale
		 *            {Number} 拡大率
		 * @param layoutCenterX
		 *            拡大の中心X座標(指定されなければ画面の中心)
		 * @param layoutCenterY
		 *            拡大の中心Y座標(指定されなければ画面の中心)
		 */
		setScale : function(scale, layoutCenterX, layoutCenterY) {
			if (this._visibleLayoutRect.scale == scale) {
				return;
			}

			var oldScale = this._visibleLayoutRect.scale;

			var newScale = scale;
			if (scale < 0) {
				newScale = 0.01;
			}

			if (layoutCenterX === undefined) {
				layoutCenterX = this._visibleLayoutRect.width / 2
						+ this._visibleLayoutRect.x;
			}
			if (layoutCenterY === undefined) {
				layoutCenterY = this._visibleLayoutRect.height / 2
						+ this._visibleLayoutRect.y;
			}

			var oldRect = {
				width : this._visibleLayoutRect.width,
				height : this._visibleLayoutRect.height
			};

			this._visibleLayoutRect.scale = newScale;
			this._visibleLayoutRect.width = this._rootSize.width / newScale;
			this._visibleLayoutRect.height = this._rootSize.height / newScale;

			var gapXRatio = (layoutCenterX - this._visibleLayoutRect.x)
					/ oldRect.width;
			var gapYRatio = (layoutCenterY - this._visibleLayoutRect.y)
					/ oldRect.height;

			var dx = (this._visibleLayoutRect.width - oldRect.width)
					* gapXRatio;
			var dy = (this._visibleLayoutRect.height - oldRect.height)
					* gapYRatio;

			this.scrollBy(-dx, -dy);

			// TODO updateRootSizeとコード重複
			var resizeArg = {
				oldSize : oldRect,
				newSize : {
					width : this._visibleLayoutRect.width, // TODO 高速化
					height : this._visibleLayoutRect.height
				}
			};
			this.trigger(this.EVENT_RESIZE, resizeArg);

			this._resizeLayers(oldRect, this._visibleLayoutRect);

			var scaleArg = {
				newScale : newScale,
				oldScale : oldScale,
				layoutVisibleRect : this._visibleLayoutRect
			};
			this.trigger(this.EVENT_SCALE, scaleArg);

			this.updateView();
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_setRoot : function(element) {
			this._root = element;
			var $root = $(this._root);
			$root.css({
				overflow : 'hidden',
				position : 'relative',
				backgroundColor : '#ffffff'
			});

			this._rootSize = {};
			this._visibleLayoutRect = {
				x : 0,
				y : 0,
				width : 0,
				height : 0,
				scale : 1
			};
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		setLayerRenderers : function(renderer) {
			this._layerRenderers = renderer;
			this.init();
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		setNodeRenderer : function(renderer) {
			this._nodeRenderer = renderer;
			this.init();
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		setEdgeRenderer : function(renderer) {
			this._edgeRenderer = renderer;
			this.init();
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		setNodeVisible : function(nodeId, isVisible) {
			var vnode = this._vnodes[nodeId];
			if (!vnode) {
				return;
			}

			// TODO falseの場合は入れなくてよい（!!で判定するようにすべきか）
			if (vnode.isVisible === undefined) {
				vnode.isVisible = true;
			}

			// TODO 可視範囲かどうかチェックする必要あり

			if (vnode.isVisible == isVisible) {
				return;
			} else if (!vnode.isVisible && isVisible) {
				// 今まで非表示だったが表示するよう変更されたとき
				this._addCommandHigh(this._drawNode, vnode);
			} else if (vnode.isVisible && !isVisible) {
				// 今まで表示だったが非表示にするよう変更されたとき
				this._addCommandHigh(this._removeNode, vnode);
			}

			vnode.isVisible = isVisible;
			this._doCommandLoop();
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		setEdgeVisible : function(edgeId, isVisible) {
			// TODO エッジを個別に非表示
		},

		/**
		 * 指定されたノードIDのビューオブジェクトを返します。
		 * ノードが可視範囲に存在しない場合（＝ビューオブジェクトが存在しない場合）はnullを返します。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 * @param nodeId
		 *            ノードID
		 * @returns ビューオブジェクト（{node, view, behavior} の3つの要素を持つオブジェクト）
		 */
		getNodeView : function(nodeId) {
			var r = this._visibleNodes[nodeId];
			if (!r) {
				return null;
			}

			return r;
		},

		getNodePosition : function(nodeId) {
			var vnode = this._getVnodeById(nodeId);
			if (!vnode) {
				return null;
			}

			var node = vnode.get();
			var align = node.align;

			if (align === 'r') {
				var nodeSize = this.getNodeSize(vnode[this._nodeIdKey]);
				return vnode.layoutPos + nodeSize.width;
			}
			return vnode.layoutPos;
		},

		getNodeRenderer : function() {
			return this._nodeRenderer;
		},

		getEdgeRenderer : function() {
			return this._edgeRenderer;
		},

		/**
		 * ビューを更新します。通常はこのメソッドを呼ぶ必要はありません。
		 * （ノードやエッジの追加・削除、ウィンドウのリサイズ時は、必要に応じて自動的にビューを更新します。）
		 * 描画領域のサイズを内部的に変更した場合にのみ呼び出すようにしてください。
		 *
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		updateView : function(immediate) {
			if (immediate === true) {
				this._isUpdateViewPending = true;
				this._updateView();
				return;
			}

			if (this._isUpdateViewPending) {
				return;
			}

			this._isUpdateViewPending = true;
			this._doAtNextFrame(this._updateView);
		},

		_doAtNextFrame : function(func, args) {
			if (this._reservedFuncArray.length == 0) {
				var that = this;
				this._requestAnimationFrame.call(window, function() {
					that._doReservedFunc();
				});
			}

			this._reservedFuncArray.push([ func, args ]);
		},

		_doReservedFunc : function() {
			for ( var i = 0, count = this._reservedFuncArray.length; i < count; i++) {
				var reserved = this._reservedFuncArray.shift();
				reserved[0].apply(this, reserved[1]);
			}
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_registerBehaviorEventDelegates : function() {
			var that = this;
			var bindBehaviorHandlers = function(behavior, selectorPrefix) {
				if (!behavior) {
					return;
				}

				if (!selectorPrefix) {
					selectorPrefix = '';
				}

				for ( var prop in behavior) {
					var func = behavior[prop];
					var lastIndex = $.trim(prop).lastIndexOf(' ');

					if (lastIndex != -1 && $.isFunction(func)) {
						var selector = selectorPrefix
								+ $.trim(prop.substring(0, lastIndex));
						var eventName = $.trim(prop.substring(lastIndex + 1,
								prop.length));
						that._registerEventDelegate(eventName, selector, func);
					}
				}
			};

			bindBehaviorHandlers(this._nodeRenderer.behavior);
			bindBehaviorHandlers(this._edgeRenderer.behavior, '.'
					+ this._LAYER_NAME_EDGE + ' ');
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_registerEventDelegate : function(eventName, selector, func) {
			if (!this._delegateHandlerMap[eventName]) {
				$(this._root).bind(eventName,
						$.proxy(this._root_delegatedHandler, this));
			}

			// リスナーのマップに追加
			if (!this._delegateHandlerMap) {
				this._delegateHandlerMap = {};
			}
			if (!this._delegateHandlerMap[eventName]) {
				this._delegateHandlerMap[eventName] = {};
			}
			this._delegateHandlerMap[eventName][selector] = func;
		},

		_containsNode : function(container, contained) {
			// SVGにネイティブ対応しているブラウザであればcompareDocumentPositionは利用可能と考えてよい
			return !!(container.compareDocumentPosition(contained) & Node.DOCUMENT_POSITION_CONTAINED_BY);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_root_delegatedHandler : function(event) {
			// 必ず、いずれか1つ以上のリスナーがこのイベントを監視している

			var currentVisibility = [];

			// TODO エッジのレイヤもinitLayerでlayersに積んでしまう？？

			// エッジレイヤを含めたすべてのレイヤのルートエレメントを集める
			// インデックスが若いほうが前にあるレイヤ（よってエッジレイヤが一番最初）
			var layerRootElements = [ this._edgeLayerElement ];
			var layerNames = [ this._LAYER_NAME_EDGE ];
			for ( var i = this._layerRenderers.length - 1; i >= 0; i--) {
				layerRootElements
						.push(this._layerRootElementMap[this._layerRenderers[i].name].rootElement);
				layerNames.push(this._layerRenderers[i].name);
			}

			var eventCtx = {
				controller : this,
				event : event,
				data : this._callbackData
			};

			var isFired = false;
			for ( var i = 0, count = layerRootElements.length; i < count; i++) {
				var layerElem = layerRootElements[i];
				var layerName = layerNames[i];

				currentVisibility.push(layerElem.style.visibility);

				var target = document.elementFromPoint(event.clientX,
						event.clientY);

				// IEはレイヤーを重ねても（前のレイヤの透明部分の場合）マウスイベントが後ろのレイヤで発生する。
				// また、IEはSVGノードでcontainsメソッドを持たないが、jQuery(Sizzle)のcontainsは
				// SVGノードの場合に誤判定してしまう。
				// これらのことから、自前でcompareDocumentPosition()を使って
				// レイヤーの子要素であるかどうかを判定する。(このメソッドはSVGノードであっても正しく親子を判定する。)
				// Firefox, Chromeの場合は、レイヤーを重ねると前のレイヤでしかイベントが発生しないので、
				// targetがレイヤ自身の場合（＝そのレイヤの透明部分をクリックした場合）は
				// 結果がfalseとなり、直ちに次のレイヤの処理に移る。
				var isTargetContainedByLayer = this._containsNode(layerElem,
						target);

				if (isTargetContainedByLayer) {
					for ( var selector in this._delegateHandlerMap[event.type]) {
						// touchイベントの場合はtouchesを見ないとダメ
						// if(isTouchEvent(event.type)) {
						// var oe = event.originalEvent.touches[0];
						// var t = document.elementFromPoint(oe.clientX,
						// oe.clientY);
						// console.log(t.nodeName);
						// }

						// TODO 警告が出るが正しく動く(jQueryWTPのせい)
						if ($(target).is(selector)) {
							// ヒットした要素に対応するvnodeとviewを取得しコンテキストに設定
							var visibleObj;
							if (layerName == this._LAYER_NAME_EDGE) {
								visibleObj = this._elementToVisibleEdge(target);
								eventCtx.vedge = visibleObj.edge;
							} else {
								visibleObj = this._elementToVisibleNode(target,
										layerName);
								eventCtx.vnode = visibleObj.node;
							}
							eventCtx.view = visibleObj.view;

							// イベントターゲットを差し替える
							event.target = target;
							event.currentTarget = target;
							event.srcElement = target;

							// TODO
							// ハンドラ実行中に例外が発生すると、途中まで行ったvisibility:hiddenが復帰しなくなる。try-catch等方法考える。
							this._delegateHandlerMap[event.type][selector]
									.call(this._nodeRenderer.behavior, eventCtx);
							isFired = true;
							break;
						}
					}
				}

				layerElem.style.visibility = 'hidden';

				if (isFired) {
					break;
				}
			}

			for ( var i = 0, count = currentVisibility.length; i < count; i++) {
				layerRootElements[i].style.visibility = currentVisibility
						.shift();
			}
		},

		_elementToVisibleNode : function(elem, layerName) {
			var layerNames = [];
			var targetLayerCount = 0;
			if (layerName) {
				layerNames.push(layerName);
				targetLayerCount = 1;
			} else {
				var layerRenderer = this._layerRenderers;
				targetLayerCount = layerRenderer.length;
				for ( var i = targetLayerCount - 1; i >= 0; i--) {
					layerNames.push(layerRenderer[i].name);
				}
			}

			var visibles = this._visibleNodes;
			for ( var key in visibles) {
				var visible = visibles[key];

				for ( var i = 0; i < targetLayerCount; i++) {
					var layerView = visible.view[layerNames[i]];
					if (layerView
							&& ((layerView === elem) || this._containsNode(
									layerView, elem))) {
						return visible;
					}
				}
			}
			return null;
		},

		_elementToVisibleEdge : function(elem) {
			var visibles = this._visibleEdges;
			for ( var key in visibles) {
				var visible = visibles[key];
				var visibleView = visible.view;
				if ((visibleView === elem)
						|| this._containsNode(visibleView, elem)) {
					return visible;
				}
			}
			return null;
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_createVNode : function(node) {
			var id = node.get(this._nodeIdKey);
			var vnode = createDataItemProxy(node);

			var ctx = {
				controller : this,
				node : node,
				data : this._callbackData
			};
			var layoutPos = this._nodeRenderer.getLayoutPos(ctx);

			if (!layoutPos) {
				throw new Error(
						'ノードレンダラのgetLayoutPos()でレイアウト座標オブジェクトが返されませんでした。');
			}

			if (!isFinite(layoutPos.x) || !isFinite(layoutPos.y)) {
				throw new Error(h5.u.str.format('ノードID = {0} のレイアウト座標が不正です。',
						id));
			}

			// TODO vnodeにnodeのidをコピーする必要はない？？
			vnode[this._nodeIdKey] = id;

			vnode.layoutPos = layoutPos;
			this._vnodes[id] = vnode;

			return vnode;
		},

		_createVedge : function(edge) {
			var vedge = createDataItemProxy(edge);
			this._vedges[edge.get(this._edgeIdKey)] = vedge;
			return vedge;
		},

		_removeVedge : function(vedge) {
			var edgeId = vedge.get(this._edgeIdKey);
			delete this._vedges[edgeId];
			return vedge;
		},

		getLayoutRect : function() {
			// nodeSortArrayは常にxの小さい順にソートされている
			var xarray = this._nodeSortArray;
			var yarray = xarray.slice(0);

			// インデックスが小さい方がyの値が小さいようにソート
			yarray.sort(nodePositionComparerByYAxis);

			var left = xarray[0].layoutPos.x;
			var right = xarray[xarray.length - 1].layoutPos.x;
			var top = yarray[0].layoutPos.y;
			var bottom = yarray[yarray.length - 1].layoutPos.y;

			return {
				x : left,
				y : top,
				width : right - left,
				height : bottom - top
			};
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_bindRootHandlers : function() {
			var $root = $(this._root);

			// TODO windowへのバインドは一度だけでよい
			$(window).bind('resize', $.proxy(this._window_resizeHandler, this));

			$root.bind('mousedown', $.proxy(this._root_mousedownHandler, this));
			$root.bind('mousemove', $.proxy(this._root_mousemoveHandler, this));
			$(window).bind('mouseup',
					$.proxy(this._window_mouseupHandler, this));

			$root.bind('click', $.proxy(this._root_clickHandler, this));

			$root.bind('dblclick', $.proxy(this._root_dblclickHandler, this));

			// TODO タッチサポートがある場合だけバインド
			$root.bind('touchstart', $
					.proxy(this._root_touchstartHandler, this));
			$root.bind('touchmove', $.proxy(this._root_touchmoveHandler, this));
			$(window).bind('touchend',
					$.proxy(this._window_touchendHandler, this));
			$(window).bind('touchcancel',
					$.proxy(this._window_touchcancelHandler, this));

			$root.bind('gesturestart', $.proxy(this._root_gesturestartHandler,
					this));
			$root.bind('gesturechange', $.proxy(
					this._root_gesturechangeHandler, this));

			// TODO Firefox対応(DOMMouseScroll)
			$root.bind('mousewheel', $
					.proxy(this._root_mousewheelHandler, this));
		},

		_root_gesturestartHandler : function(event) {
			event.preventDefault();
			this._lastGestureScale = event.originalEvent.scale;
		},

		_root_gesturechangeHandler : function(event) {
			event.preventDefault();
			var newScale = this.getScale()
					+ (event.originalEvent.scale - this._lastGestureScale);
			this.setScale(newScale);
			this._lastGestureScale = event.originalEvent.scale;
		},

		_root_mousewheelHandler : function(event) {
			// 下に回すとwheelDeltaはマイナス

			event.preventDefault();

			// TODO どの操作でどうするかは要検討
			if (event.shiftKey) {
				// シフトキーが押されていたら拡大縮小
				var ds = 0.1;
				if (event.originalEvent.wheelDelta < 0) {
					ds *= -1;
				}

				var rootOffset = $(this.rootElement).offset();
				var cx = event.originalEvent.pageX - rootOffset.left;
				var cy = event.originalEvent.pageY - rootOffset.top;

				var scaleCenter = this._getLayoutPosFromScreenOffset(cx, cy);

				this.setScale(this._visibleLayoutRect.scale + ds,
						scaleCenter.x, scaleCenter.y);
				return;
			}

			// スクロールする
			var dy = 40;
			if (event.originalEvent.wheelDelta < 0) {
				dy *= -1;
			}
			this.scrollBy(0, dy);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_window_resizeHandler : function(event) {
			if (!this._root) {
				return;
			}

			var $root = $(this._root);
			var w = $root.innerWidth();
			var h = $root.innerHeight();

			if ((this._rootSize.width != w) || (this._rootSize.height != h)) {
				this.updateView();
			}
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_isNode : function(event) {
			if (event.target !== this._root) {
				return true;
			}
			return false;
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_getActualTarget : function(event) {
			return this._getActualTargetAt(event.clientX, event.clientY);
		},

		_getActualTargetAt : function(clientX, clientY) {
			// TODO elementToVisibleで判定までやって、そのあとハンドラをクリックするようにするのがよさそう
			// delegatedHandlerと処理を統合すべき

			var currentVisibility = [];

			var layerRootElements = [ this._edgeLayerElement ];
			for ( var i = this._layerRenderers.length - 1; i >= 0; i--) {
				layerRootElements
						.push(this._layerRootElementMap[this._layerRenderers[i].name].rootElement);
			}

			var layerName = null;
			var isEdgeElement = false;
			var actualTarget = null;
			for ( var i = 0, count = layerRootElements.length; i < count; i++) {
				var layerElem = layerRootElements[i];

				var target = document.elementFromPoint(clientX, clientY);

				// IEはレイヤーを重ねても（前のレイヤの透明部分の場合）マウスイベントが後ろのレイヤで発生する。
				// また、IEはSVGノードでcontainsメソッドを持たないが、jQuery(Sizzle)のcontainsは
				// SVGノードの場合に誤判定してしまう。
				// これらのことから、自前でcompareDocumentPosition()を使って
				// レイヤーの子要素であるかどうかを判定する。(このメソッドはSVGノードであっても正しく親子を判定する。)
				// Firefox, Chromeの場合は、レイヤーを重ねると前のレイヤでしかイベントが発生しないので、
				// targetがレイヤ自身の場合（＝そのレイヤの透明部分をクリックした場合）は
				// 結果がfalseとなり、直ちに次のレイヤの処理に移る。
				var isTargetContainedByLayer = this._containsNode(layerElem,
						target);

				if (!isTargetContainedByLayer) {
					currentVisibility.push(layerElem.style.visibility);
					layerElem.style.visibility = 'hidden';
					continue;
				}

				// ノードまたはエッジにヒットした

				actualTarget = target;

				if (layerElem === this._edgeLayerElement) {
					isEdgeElement = true;
				} else {
					layerName = this._layerRenderers[count - i - 1].name;
				}

				break;
			}

			for ( var i = 0, count = currentVisibility.length; i < count; i++) {
				layerRootElements[i].style.visibility = currentVisibility
						.shift();
			}

			if (!actualTarget) {
				return null;
			}

			var visible;
			if (isEdgeElement) {
				visible = this._elementToVisibleEdge(actualTarget);
			} else {
				visible = this._elementToVisibleNode(actualTarget, layerName);
			}

			if (!visible) {
				// レイヤーに（ノード・エッジ以外の）独自要素がある場合に
				// 「クリックされた要素はいずれかのレイヤーの子要素だったが、
				// しかしノードでもエッジでもない」という場合が存在しうる。
				// そのため、visibleが返ってこなかった場合はターゲットなしとしてnullを返す。
				return null;
			}

			var ret = {
				targetElement : actualTarget,
				isEdge : isEdgeElement, // エッジでなければ必ずノード(本当はtype等にすべきかもしれないが、現状ではノードかエッジのみ)
				visible : visible
			};
			return ret;
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_root_mousedownHandler : function(event) {
			if (!this.isEnableScreenDrag && !this.isEnableNodeDrag) {
				return;
			}

			event.preventDefault();

			this._prepareDrag(event);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_root_mousemoveHandler : function(event) {
			if (!this._isDragging) {
				this._handleEnterLeave(event);
				return;
			}

			event.preventDefault();

			this._drag(event);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_window_mouseupHandler : function(event) {
			if (!this._isDragging) {
				return;
			}
			this._endDrag(event);
		},

		_root_clickHandler : function(event) {
			if (this._isDragged) {
				// ドラッグ直後のclickイベントは無視する
				this._isDragged = false;
				return;
			}

			var actual = this._getActualTarget(event);

			var isExclusive = !event.ctrlKey;

			if (!actual) {
				// actualがnullということは、エッジ・ノードもクリックされていない

				if (isExclusive) {
					// 排他的操作の場合、全選択ノードを解除
					this.unselectNodeAll();
				}

				return;
			}

			var evName, arg;
			if (actual.isEdge) {
				evName = this.EVENT_EDGE_CLICK;
				arg = {
					edge : actual.visible.edge,
					view : actual.visible.view,
					fromNode : actual.visible.fromNode, // from, toもvnode
					toNode : actual.visible.toNode
				};
			} else {
				evName = this.EVENT_NODE_CLICK;
				arg = {
					vnode : actual.visible.node,
					view : actual.visible.view
				};
			}

			this.trigger(evName, arg);

			if (!actual.isEdge) {
				var nodeId = actual.visible.node.get(this._nodeIdKey);

				if (isExclusive) {
					this.selectNode(nodeId, isExclusive);
				} else {
					this.toggleSelectNode(nodeId);
				}
			}
		},

		_root_dblclickHandler : function(event) {
			var actual = this._getActualTarget(event);

			if (!actual) {
				// actualがnullということは、エッジ・ノードもクリックされていない
				return;
			}

			var evName, arg;
			if (actual.isEdge) {
				evName = this.EVENT_EDGE_DBLCLICK;
				arg = {
					edge : actual.visible.edge,
					view : actual.visible.view,
					fromNode : actual.visible.fromNode, // from, toもvnode
					toNode : actual.visible.toNode
				};
			} else {
				evName = this.EVENT_NODE_DBLCLICK;
				arg = {
					vnode : actual.visible.node,
					view : actual.visible.view
				};
			}

			this.trigger(evName, arg);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_root_touchstartHandler : function(event) {
			if (!this.isEnableScreenDrag) { // TODO isEnableNodeDragも判定する必要あり
				return;
			}

			event.preventDefault();
			this._prepareDrag(event.originalEvent.touches[0]);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_root_touchmoveHandler : function(event) {
			if (!this._isDragging) {
				return;
			}
			event.preventDefault();
			this._drag(event.originalEvent.touches[0]);

		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_window_touchendHandler : function(event) {
			if (!this._isDragging) {
				return;
			}

			this._endDrag(event);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_window_touchcancelHandler : function(event) {
			if (!this._isDragging) {
				return;
			}

			this._endDrag(event);
		},

		_lastEnterSrc : null,

		/**
		 * ノードのホバーイベントを起こします。 (エッジも対応可能ですが、現時点ではノードのみを対象にしています。
		 * エッジを対象にするとヒット判定を領域的に判定するのが難しくなるため、 将来的なAPI互換性のため対応を保留しています。)
		 */
		_handleEnterLeave : function(event) {
			var actual = this._getActualTarget(event);

			if (actual && actual.isEdge) {
				// エッジは「ノードのない位置」扱いとする
				actual = null;
			}

			if (this._lastEnterSrc && !actual) {
				// ノード上からノードのない位置に移動した
				this._triggerNodeEnterLeaveEvent(this.EVENT_NODE_LEAVE,
						this._lastEnterSrc);
			} else if (this._lastEnterSrc
					&& this._lastEnterSrc.visible !== actual.visible) {
				// 別のノードに移動した
				this._triggerNodeEnterLeaveEvent(this.EVENT_NODE_LEAVE,
						this._lastEnterSrc);
				this._triggerNodeEnterLeaveEvent(this.EVENT_NODE_ENTER, actual);
			} else if (!this._lastEnterSrc && actual) {
				// ノードのない位置からノード上に移動した
				this._triggerNodeEnterLeaveEvent(this.EVENT_NODE_ENTER, actual);
			}
			// mousemove前後で同じノードだった、またはノードのない位置での移動だった＝何もしない

			this._lastEnterSrc = actual;
		},

		_triggerNodeEnterLeaveEvent : function(evName, src) {
			arg = {
				vnode : src.visible.node,
				view : src.visible.view
			};
			this.trigger(evName, arg);
		},

		moveNodeTo : function(nodeId, layoutX, layoutY, fix) {
			var vnode = this._getVnodeById(nodeId);

			var dx = layoutX - vnode.layoutPos.x;
			var dy = layoutY - vnode.layoutPos.y;
			this.moveNodeBy(vnode.get(this._nodeIdKey), dx, dy, fix);
		},

		/**
		 * @param fix
		 *            デフォルト：true
		 */
		moveNodeBy : function(nodeId, dLayoutX, dLayoutY, fix) {
			var vnode = this._getVnodeById(nodeId);

			var oldLayoutX = vnode.layoutPos.x;
			var oldLayoutY = vnode.layoutPos.y;

			vnode.layoutPos.x += dLayoutX;
			vnode.layoutPos.y += dLayoutY;

			this._updateVisibleNodePos(this.getNodeView(nodeId));

			var relatedEdges = this._graph.getRelatedEdges(nodeId);
			this._updateVisibleEdgePos(relatedEdges);

			if (fix !== false) {
				this._nodeSortArray.splice($
						.inArray(vnode, this._nodeSortArray), 1);
				sortedInsert(this._nodeSortArray, vnode, nodePositionComparer);
			}

			var layoutPos = vnode.layoutPos;

			var nodeMoveArg = {
				vnode : vnode,
				layoutX : layoutPos.x,
				layoutY : layoutPos.y,
				oldLayoutX : oldLayoutX,
				oldLayoutY : oldLayoutY
			};
			this.trigger(this.EVENT_NODE_MOVE, nodeMoveArg);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_prepareDrag : function(event) {
			this._lastMousePosition = {
				x : event.clientX,
				y : event.clientY
			};

			this._dragStartMousePosition = {
				x : event.clientX,
				y : event.clientY
			};

			this._isDragging = true;

			var actualTarget = this._getActualTarget(event);
			if (actualTarget && !actualTarget.isEdge) {
				this._dragTargetNode = actualTarget.visible;
				if (this._dragTargetNode) {
					var dragTargetVnode = this._dragTargetNode.node;

					this._isFirstDragMove = true;

					this._dragMode = DRAG_MODE_NODE;
					this._nodeDragBeginPos = {
						x : dragTargetVnode.layoutPos.x,
						y : dragTargetVnode.layoutPos.y
					};
				}
			} else if (event.shiftKey) {
				this._dragMode = DRAG_MODE_SELECT;
				this._$dragSelectOverlay = $(TMPL_DRAG_SELECT_OVERLAY);

				this._lastSelectedNodes = [];

				var rootOffset = $(this.rootElement).offset();
				var overlayTop = event.pageY - rootOffset.top;
				var overlayLeft = event.pageX - rootOffset.left;

				this._$dragSelectOverlay.css({
					top : overlayTop,
					left : overlayLeft,
					width : 0,
					height : 0
				}).appendTo(this.rootElement);
			} else {
				this._dragMode = DRAG_MODE_SCROLL;
			}
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_drag : function(event) {
			// マウス座標＝"見た目"での移動量が必要なので、ここでscaleを計算する
			var dx = (event.clientX - this._lastMousePosition.x)
					/ this._visibleLayoutRect.scale;
			var dy = (event.clientY - this._lastMousePosition.y)
					/ this._visibleLayoutRect.scale;

			this._lastMousePosition.x = event.clientX;
			this._lastMousePosition.y = event.clientY;

			if (this._dragMode === DRAG_MODE_NODE) {
				this._dragNode(event, dx, dy);
			} else if (this._dragMode === DRAG_MODE_SCROLL) {
				this.scrollBy(-dx, -dy);
			} else if (this._dragMode === DRAG_MODE_SELECT) {
				this._dragSelect(event);
			}

			// 一度でもmousemoveが起きたら、ドラッグがあったとする
			this._isDragged = true;
		},

		_dragNode : function(event, dx, dy) {
			if (this._isFirstDragMove) {
				// 最初のムーブが起きたときに初めてNODE_DRAG_BEGINイベントを出す
				// mousedownのタイミングではBEGINしないようにする
				this._isFirstDragMove = false;

				var evArg = {
					vnode : this._dragTargetNode.node,
					beginLayoutPos : this._nodeDragBeginPos
				};
				this.trigger(this.EVENT_NODE_DRAG_BEGIN, evArg);
			}

			var edgePos = getEdgePosition(this.rootElement, event.pageX,
					event.pageY, 15);

			if (edgePos === RANGE_OUT) {
				// 外部の場合は何もしない
				return;
			}

			// エッジ付近の場合も、マウス位置に追従するようにノードを動かす
			this.moveNodeBy(this._dragTargetNode.node.get(this._nodeIdKey), dx,
					dy, false);

			if (edgePos === RANGE_IN) {
				// 内部＝自動エッジスクロール停止
				this._endContinuousEdgeScroll();
			} else {
				// 自動エッジスクロールを開始
				this._beginContinuousEdgeScroll(edgePos);
			}
		},

		_endContinuousEdgeScroll : function() {
			if (this._dragNodeEdgeScrollTimerId) {
				clearInterval(this._dragNodeEdgeScrollTimerId);
				this._dragNodeEdgeScrollTimerId = null;
			}
		},

		_beginContinuousEdgeScroll : function(edgePos) {
			var dx = 0, dy = 0;

			if (edgePos.indexOf('n') !== -1) {
				dy = -EDGE_SCROLL_VALUE;
			} else if (edgePos.indexOf('s') !== -1) {
				dy = EDGE_SCROLL_VALUE;
			}

			if (edgePos.indexOf('w') !== -1) {
				dx = -EDGE_SCROLL_VALUE;
			} else if (edgePos.indexOf('e') !== -1) {
				dx = EDGE_SCROLL_VALUE;
			}

			var that = this;
			var nodeId = this._dragTargetNode.node.get(this._nodeIdKey);

			function edgeScroll() {
				that.scrollBy(dx, dy);
				that.moveNodeBy(nodeId, dx, dy, false);
			}

			edgeScroll();

			if (this._dragNodeEdgeScrollTimerId) {
				clearInterval(this._dragNodeEdgeScrollTimerId);
			}

			this._dragNodeEdgeScrollTimerId = setInterval(edgeScroll,
					EDGE_SCROLL_INTERVAL);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_endDrag : function(context) {
			if (this._dragMode === DRAG_MODE_NODE && !this._isFirstDragMove) {
				// isFirstDragMoveがfalse ＝ 一度以上mousemoveが起きた
				// ＝ドラッグ操作が起きた、ということ
				// ドラッグが何も行われていなければ、再ソートは不要

				// ノードのドラッグだったらノードの位置順のソートを再呼び出しする。
				// nodeSortArrayドラッグしていたノードを外して、再挿入する。
				this._nodeSortArray.splice($.inArray(this._dragTargetNode.node,
						this._nodeSortArray), 1);
				sortedInsert(this._nodeSortArray, this._dragTargetNode.node,
						nodePositionComparer);

				var dragTargetVnode = this._dragTargetNode.node;

				var ev = {
					vnode : dragTargetVnode,
					beginLayoutPos : {
						x : this._nodeDragBeginPos.x,
						y : this._nodeDragBeginPos.y
					},
					endLayoutPos : {
						x : dragTargetVnode.layoutPos.x,
						y : dragTargetVnode.layoutPos.y
					}
				};
				this.trigger(this.EVENT_NODE_DRAG_END, ev);

				this._nodeDragBeginPos = null;
			} else if (this._dragMode === DRAG_MODE_SELECT) {
				this._$dragSelectOverlay.remove();
				this._$dragSelectOverlay = null;
			}

			this._endContinuousEdgeScroll();

			this._dragStartMousePosition = null;
			this._isDragging = false;
			this._dragMode = DRAG_MODE_NONE;
			this._lastSelectedNodes = [];
			this._isFirstDragMove = false;
			this._dragTargetNode = null;
			this._lastMousePosition = null;
		},

		_dragSelect : function(event) {
			var region = this._getDragSelectRegion(event);

			var layoutTopLeft = this._getLayoutPosFromScreenOffset(region.x,
					region.y);
			var layoutBottomRight = this._getLayoutPosFromScreenOffset(region.x
					+ region.width, region.y + region.height);

			var x = layoutTopLeft.x;
			var y = layoutTopLeft.y;
			var width = layoutBottomRight.x - x;
			var height = layoutBottomRight.y - y;

			var selectedNodes = this._getNodesInRegion(x, y, width, height,
					false);

			var unselectNodes = this._lastSelectedNodes;

			for ( var i = 0, len = selectedNodes.length; i < len; i++) {
				var node = selectedNodes[i];

				this.selectNode(node.get(this._nodeIdKey));

				var idx = $.inArray(node, unselectNodes);
				if (idx !== -1) {
					unselectNodes[idx] = null;
				}
			}

			for ( var i = 0, len = unselectNodes.length; i < len; i++) {
				var unselectNode = unselectNodes[i];
				if (unselectNode) {
					this.unselectNode(unselectNode.get(this._nodeIdKey));
				}
			}

			this._lastSelectedNodes = selectedNodes;

			// 内部処理でエラーが起きたときにオーバーレイ表示が更新されないよう、表示更新は最後に行う
			this._$dragSelectOverlay.css({
				top : region.y,
				left : region.x,
				width : region.width,
				height : region.height
			});
		},

		_getDragSelectRegion : function(event) {
			var rootOffset = $(this.rootElement).offset();
			var ry = event.pageY - rootOffset.top; // r = relative
			var rx = event.pageX - rootOffset.left;

			var dx = rx - this._dragStartMousePosition.x;
			var dy = ry - this._dragStartMousePosition.y;

			var x, y, w, h;

			if (dx < 0) {
				x = rx;
				w = -dx;
			} else {
				x = this._dragStartMousePosition.x;
				w = dx;
			}

			if (dy < 0) {
				y = ry;
				h = -dy;
			} else {
				y = this._dragStartMousePosition.y;
				h = dy;
			}

			return {
				x : x,
				y : y,
				width : w,
				height : h
			};
		},

		_updateVisibleNodePos : function(visibleNode) {
			if (!visibleNode) {
				return;
			}

			var nodeView = visibleNode.view;
			var layoutX = visibleNode.node.layoutPos.x;
			var layoutY = visibleNode.node.layoutPos.y;

			var vnode = visibleNode.node;
			var alignment;
			if (this._nodeRenderer.getAlignment) {
				var alignment = this._nodeRenderer.getAlignment({vnode: vnode});
			}
			var nodeSize;
			if (alignment === 'r') {
				nodeSize = this.getNodeSize(vnode[this._nodeIdKey]);
			}

			// TODO drawNodeとコード重複
			for ( var i = 0, count = this._layerRenderers.length; i < count; i++) {
				var renderer = this._layerRenderers[i];
				var layerName = renderer.name;

				if (!nodeView[layerName]) {
					// このレイヤに対応するビューが存在しない場合はスキップ
					// 背景レイヤなどの場合にここに来る
					continue;
				}

				if (renderer.type == 'svg') {
					this._setTranslate(nodeView[layerName], layoutX, layoutY);
				} else {
					// divの場合
					$(nodeView[layerName]).css({
						// TODO このあたりの設定はどこに持たせるか再考
						position : 'absolute',
						left : layoutX,
						top : layoutY
					});
				}
			}
		},

		_updateVisibleEdgePos : function(edges) {
			if (!edges || (!edges.from && !edges.to)) {
				return;
			}

			var that = this;

			// TODO 関数を外部に出すべきか
			var fireNodeMove = function(edgeArray) {
				for ( var i = 0, count = edgeArray.length; i < count; i++) {
					var edge = edgeArray[i];
					var edgeId = edge.get(that._edgeIdKey);

					var endpoint = that._graph.getEndpointNodeId(edgeId);

					endpoint.fromId;

					var fromVnode = that._vnodes[edge
							.get(that._graph._fromNodeIdKey)]; // that._vnodes[endpoint.fromId];
					// //that._vnodes[edge.get(this._graph._fromNodeIdKey)];
					var toVnode = that._vnodes[edge
							.get(that._graph._toNodeIdKey)]; // that._vnodes[edge.get(this._graph._toNodeIdKey)];
					// //
					// that._vnodes[endpoint.toId];

					if (edgeId in that._visibleEdges) {
						var visibleEdge = that._visibleEdges[edgeId];

						var fromEdgeCtx = {
							controller : that,
							fromVnode : fromVnode,
							toVnode : toVnode,
							vedge : visibleEdge.edge,
							view : visibleEdge.view,
							data : that._callbackData
						};

						if (visibleEdge.behavior
								&& visibleEdge.behavior.onnodemove) {
							visibleEdge.behavior.onnodemove(fromEdgeCtx);
						}
					}
				}
			};

			if (edges.from) {
				fireNodeMove(edges.from);
			}

			if (edges.to) {
				fireNodeMove(edges.to);
			}
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_bindGraphHandlers : function() {
			var that = this;

			this._graph.addEventListener('nodeAdd', function(event) {
				that._graph_nodeAddHandler(event);
			});
			this._graph.addEventListener('nodeChange', function(event) {
				that._graph_nodeChangeHandler(event);
			});
			this._graph.addEventListener('nodeRemove', function(event) {
				that._graph_nodeRemoveHandler(event);
			});
			this._graph.addEventListener('edgeAdd', function(event) {
				that._graph_edgeAddHandler(event);
			});
			this._graph.addEventListener('edgeChange', function(event) {
				that._graph_edgeChangeHandler(event);
			});
			this._graph.addEventListener('edgeRemove', function(event) {
				that._graph_edgeRemoveHandler(event);
			});
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_graph_nodeAddHandler : function(event) {
			var node = event.node;
			var vn = this._createVNode(node);
			sortedInsert(this._nodeSortArray, vn, nodePositionComparer);

			// TODO ここでアップデートするのは負荷が高いのでvisibleRangeを見てdrawNodeするのがよい
			this.updateView();
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_graph_nodeChangeHandler : function(event) {
			var nodeId = event.node.get(this._nodeIdKey);

			if (nodeId in this._visibleNodes) {
				var visibleNode = this._visibleNodes[nodeId];
				if (visibleNode.behavior && visibleNode.behavior.ondataupdate) {
					var ctx = {
						controller : this,
						vnode : visibleNode.node,
						view : visibleNode.view,
						data : this._callbackData
					};
					visibleNode.behavior.ondataupdate(ctx);
				}
			}
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_graph_nodeRemoveHandler : function(event) {
			var nodeIdKey = this._nodeIdKey;

			var nodeId = event.node.get(nodeIdKey);

			// TODO 高速化の余地あり
			for ( var i = 0, count = this._nodeSortArray.length; i < count; i++) {
				if (this._nodeSortArray[i][nodeIdKey] == nodeId) {
					this._nodeSortArray.splice(i, 1);
					break;
				}
			}

			if (nodeId in this._visibleNodes) {
				var visibleNode = this._visibleNodes[nodeId];
				this._removeNode(visibleNode.node);
			}
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_graph_edgeAddHandler : function(event) {
			var edge = event.edge;

			var vedge = this._createVedge(edge);

			if (this._isDrawEdgesPending) {
				return;
			}
			this._isDrawEdgesPending = true;

			var that = this;
			this._doAtNextFrame(function() {
				that._isDrawEdgesPending = false;
				// TODO 高速化の余地あり
				that._drawEdges();
			});
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_graph_edgeChangeHandler : function(event) {
			// 現状ではエッジの変更通知イベントはない
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_graph_edgeRemoveHandler : function(event) {
			var vedge = this._vedges[event.edge.get(this._edgeIdKey)];

			if (!vedge) {
				return;
			}

			this._removeVisibleEdge(vedge);
			this._removeVedge(vedge);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_createLayers : function() {
			if (!this._layerRenderers) {
				// TODO
				// this.throwError()メソッド等あるとよいかもしれない(ControllerErrorクラスでエラーを投げる等)
				throw new Error('レイヤレンダラが指定されていません。最低１つ以上のレイヤが必要です。');
			}

			var that = this;

			var createLayer = function(type, name) {
				switch (type) {
				case 'svg':
					var svg = createSvgElement('svg', {
						width : '100%',
						height : '100%',
						class : name
					}); // TODO width, heightを100%にするべきか

					svg.style.position = 'absolute';
					svg.style.top = '0px';
					svg.style.left = '0px';

					var g = createSvgElement('g');
					svg.appendChild(g);

					return svg;
				case 'div':
					var div = document.createElement('div');
					$div = $(div);
					// TODO このあたりの設定はどこに持たせるか再考
					$div.css({
						position : 'absolute',
						top : 0,
						left : 0,
						width : '100%',
						height : '100%',
						'-webkit-transform-origin' : '0% 0%', // CSS3
						// Transformのデフォルトは中心なのでSVGに合わせて左上にする
						'-moz-transform-origin' : '0% 0%',
						'-ms-transform-origin' : '0% 0%',
					});
					$div.addClass(name);
					return div;
				default:
					throw new Error('レイヤのtypeはsvg,divのどちらかを指定してください。');
				}
			};

			var scrModeToVal = function(mode) {
				switch (mode) {
				case 'x':
					return that._LAYER_SCROLL_MODE_X;
				case 'y':
					return that._LAYER_SCROLL_MODE_Y;
				case 'none':
					return that._LAYER_SCROLL_MODE_NONE;
				default:
					return that._LAYER_SCROLL_MODE_XY;
				}
			};

			var initCtx = {
				controller : this,
				data : this._callbackData,
				size : this._rootSize
			};

			for ( var i = 0, count = this._layerRenderers.length; i < count; i++) {
				var renderer = this._layerRenderers[i];
				var elem = createLayer(renderer.type, renderer.name);

				var scrMode = scrModeToVal(renderer.scrollMode);

				this._layerRootElementMap[renderer.name] = {
					rootElement : elem,
					scrollMode : scrMode
				};
				this._root.appendChild(elem);

				if (renderer.behavior && renderer.behavior.oninit) {
					if (renderer.type == 'svg') {
						initCtx.layerRootElement = elem.childNodes[0];
						renderer.behavior.oninit(initCtx);
					} else {
						// divの場合
						initCtx.layerRootElement = elem;
						renderer.behavior.oninit(initCtx);
					}
				}
			}

			this._edgeLayerScrollMode = scrModeToVal(this._edgeRenderer.scrollMode);

			// エッジ用のレイヤは固定的に一番上に配置
			this._edgeLayerElement = createLayer('svg', this._LAYER_NAME_EDGE);
			this._root.appendChild(this._edgeLayerElement);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_updateRootSize : function() {
			var $root = $(this._root);

			var w = $root.innerWidth();
			var h = $root.innerHeight();

			if ((this._rootSize.width != w) || (this._rootSize.height != h)) {
				var oldW = this._visibleLayoutRect.width;
				var oldH = this._visibleLayoutRect.height;

				this._rootSize.width = w;
				this._rootSize.height = h;

				this._visibleLayoutRect.width = w
						/ this._visibleLayoutRect.scale;
				this._visibleLayoutRect.height = h
						/ this._visibleLayoutRect.scale;

				var oldSize = {
					width : oldW,
					height : oldH
				};

				var resizeArg = {
					oldSize : oldSize,
					newSize : {
						width : this._visibleLayoutRect.width, // TODO 高速化
						height : this._visibleLayoutRect.height
					}
				};
				this.trigger(this.EVENT_RESIZE, resizeArg);

				this._resizeLayers(oldSize, this._visibleLayoutRect);
			}
		},

		_resizeLayers : function(oldSize, newSize) {
			// TODO newSizeは、Rect（x,y,w,h）になる予定

			var layerRenderers = this._layerRenderers;

			if (!layerRenderers || (layerRenderers.length == 0)) {
				return;
			}

			var resizeCtx = {
				controller : this,
				oldSize : oldSize,
				newSize : newSize,
				data : this._callbackData
			};

			// TODO scrollToとコード少し重複

			for ( var i = 0, count = layerRenderers.length; i < count; i++) {
				var renderer = layerRenderers[i];
				var layerElem = this._layerRootElementMap[renderer.name].rootElement;

				if (!renderer.behavior || !renderer.behavior.onresize) {
					continue;
				}

				// TODO もう少し整理できそう
				if (renderer.type == 'svg') {
					resizeCtx.layerRootElement = layerElem.childNodes[0];
				} else {
					resizeCtx.layerRootElement = layerElem;
				}

				renderer.behavior.onresize(resizeCtx);
			}
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_updateView : function() {
			// this.log.debug('_updateView called');

			if (!this._isUpdateViewPending) {
				// updateViewが予約されていたものの、
				// そのあと何かのタイミングですでにアップデートが行われたので再度計算する必要がない
				return;
			}

			this._isUpdateViewPending = false;

			this._updateRootSize();

			var margin = this._rootSize.width / this._visibleLayoutRect.scale;

			// 可視範囲を計算
			var startLayoutX = this._visibleLayoutRect.x
					- this._nodeRenderer.typicalSize.width
					/ this._visibleLayoutRect.scale - margin;
			var startLayoutY = this._visibleLayoutRect.y
					- this._nodeRenderer.typicalSize.height
					/ this._visibleLayoutRect.scale - margin;

			var endLayoutX = startLayoutX + this._visibleLayoutRect.width
					+ this._nodeRenderer.typicalSize.width
					/ this._visibleLayoutRect.scale + margin * 2;
			var endLayoutY = startLayoutY + this._visibleLayoutRect.height
					+ this._nodeRenderer.typicalSize.height
					/ this._visibleLayoutRect.scale + margin * 2;

			// this.log.debug('sx={0},sy={1},ex={2},ey={3}', startLayoutX,
			// startLayoutY, endLayoutX,
			// endLayoutY);

			var addNodeArray = [];

			var alreadyAddedNodeMap = {};

			var nodeIdKey = this._nodeIdKey;

			// TODO 高速化の余地あり
			for ( var i = 0, count = this._nodeSortArray.length; i < count; i++) {
				var node = this._nodeSortArray[i];
				var viewPos = node.layoutPos;

				var viewX = viewPos.x;
				if (viewX < startLayoutX) {
					continue;
				} else if (viewX > endLayoutX) {
					break;
				}

				var viewY = viewPos.y;
				var isNodeVisible = (node.isVisible === undefined)
						|| node.isVisible;
				if ((startLayoutY <= viewY) && (viewY <= endLayoutY)
						&& isNodeVisible) {
					if (node.get(nodeIdKey) in this._visibleNodes) {
						alreadyAddedNodeMap[node.get(nodeIdKey)] = null;
					} else {
						addNodeArray.push(node);
					}
				}
			}

			var recyclingVisibleNodes = [];

			for ( var vnkey in this._visibleNodes) {
				var visibleNode = this._visibleNodes[vnkey];
				if (!(visibleNode.node.get(nodeIdKey) in alreadyAddedNodeMap)) {
					var vn = this._removeNode(visibleNode.node, true);
					recyclingVisibleNodes.push(vn);
					// this.log.debug('node recycled');
				}
			}

			var actualRemoveCount = recyclingVisibleNodes.length
					- addNodeArray.length;
			if (actualRemoveCount > 0) {
				for ( var i = 0; i < actualRemoveCount; i++) {
					this._removeVisibleNode(recyclingVisibleNodes.shift());
				}
			}

			for ( var i = 0, count = addNodeArray.length
					- recyclingVisibleNodes.length; i < count; i++) {
				recyclingVisibleNodes.push(this._createVisibleNode());
				// this.log.debug('node created');
			}

			for ( var i = 0, count = addNodeArray.length; i < count; i++) {
				this._addCommand(this._drawNode, addNodeArray[i],
						recyclingVisibleNodes[i]);
			}

			// TODO エッジを消す処理が必要（今はどんどんノードが増えていく）
			this._addCommandLow(this._drawEdges);

			this._doCommandLoop();
		},

		_createVisibleNode : function() {
			var view = this._nodeViewPool.borrowObject();
			var behavior = this._nodeBehaviorPool.borrowObject();

			for ( var i = 0, count = this._layerRenderers.length; i < count; i++) {
				var renderer = this._layerRenderers[i];
				var layerName = renderer.name;

				if (!view[layerName]) {
					// このレイヤに対応するビューが存在しない場合はスキップ
					// 背景レイヤなどの場合にここに来る
					continue;
				}

				var layerElem = this._layerRootElementMap[layerName].rootElement;

				if (renderer.type == 'svg') {
					layerElem.childNodes[0].appendChild(view[layerName]);
				} else {
					layerElem.appendChild(view[layerName]);
				}
			}

			return {
				view : view,
				behavior : behavior
			};
		},

		_removeVisibleNode : function(visibleNode) {
			var nodeView = visibleNode.view;
			var behavior = visibleNode.behavior;

			for ( var i = 0, count = this._layerRenderers.length; i < count; i++) {
				var renderer = this._layerRenderers[i];
				var layerName = renderer.name;

				if (!nodeView[layerName]) {
					// このレイヤに対応するビューが存在しない場合はスキップ
					// 背景レイヤなどの場合にここに来る
					continue;
				}

				var layerElem = this._layerRootElementMap[layerName].rootElement;

				if (renderer.type == 'svg') {
					layerElem.childNodes[0].removeChild(nodeView[layerName]);
				} else {
					// divの場合
					layerElem.removeChild(nodeView[layerName]);
				}
			}

			this._nodeViewPool.returnObject(nodeView);
			this._nodeBehaviorPool.returnObject(behavior);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_drawNode : function(vnode, visibleNode) {
			var useRecycledVisibleNode = !!visibleNode;

			var nodeView, behavior;

			if (useRecycledVisibleNode) {
				nodeView = visibleNode.view;
				behavior = visibleNode.behavior;
			} else {
				nodeView = this._nodeViewPool.borrowObject();
				behavior = this._nodeBehaviorPool.borrowObject();
			}

			var nodeId = vnode[this._nodeIdKey];

			this._visibleNodes[nodeId] = {
				node : vnode,
				view : nodeView,
				behavior : behavior
			};

			var layoutPos = vnode.layoutPos;

			for ( var i = 0, count = this._layerRenderers.length; i < count; i++) {
				var renderer = this._layerRenderers[i];
				var layerName = renderer.name;

				if (!nodeView[layerName]) {
					// このレイヤに対応するビューが存在しない場合はスキップ
					// 背景レイヤなどの場合にここに来る
					continue;
				}

				var layerElem = this._layerRootElementMap[layerName].rootElement;

				if (renderer.type == 'svg') {
					if (!useRecycledVisibleNode) {
						layerElem.childNodes[0]
								.appendChild(nodeView[layerName]);
					}
				} else {
					// divの場合
					if (!useRecycledVisibleNode) {
						layerElem.appendChild(nodeView[layerName]);
					}
					$(nodeView[layerName]).css({
							position : 'absolute'
					});
				}
			}

			// console.log('node added = ' + vnode.id);

			// TODO 警告が出るが実際には問題なく動作する
			if ($.isFunction(behavior.onbind)) {
				var ctx = {
					controller : this,
					vnode : vnode,
					view : nodeView,
					data : this._callbackData
				};
				behavior.onbind(ctx);
			}

			var alignment;
			if (this._nodeRenderer.getAlignment) {
				alignment = this._nodeRenderer.getAlignment({vnode: vnode});
			}
			var nodeSize;
			if (alignment === 'r') {
				nodeSize = this.getNodeSize(nodeId);
			}

			for ( var i = 0, count = this._layerRenderers.length; i < count; i++) {
				var renderer = this._layerRenderers[i];
				var layerName = renderer.name;
				if (!nodeView[layerName]) {
					// このレイヤに対応するビューが存在しない場合はスキップ
					// 背景レイヤなどの場合にここに来る
					continue;
				}

				if (renderer.type == 'svg') {
					if (alignment === 'r') {
						layoutPos.x -= nodeSize.width
						this._setTranslate(nodeView[layerName], layoutPos.x,
								layoutPos.y);
						vnode.layoutPos = layoutPos;
					} else {
						this._setTranslate(nodeView[layerName], layoutPos.x,
								layoutPos.y);
					}
				} else {
					if (alignment === 'r') {
						var nodeSize = this.getNodeSize(nodeId);
						layoutPos.x -= nodeSize.width
						$(nodeView[layerName]).css({
							// TODO このあたりの設定はどこに持たせるか再考
							top : layoutPos.y,
							left : layoutPos.x
						});
						vnode.layoutPos = layoutPos;
					} else {
						$(nodeView[layerName]).css({
							// TODO このあたりの設定はどこに持たせるか再考
							top : layoutPos.y,
							left : layoutPos.x
						});
					}
				}
			}

			if (this.isSelectedNode(nodeId)) {
				if ($.isFunction(behavior.onselect)) {
					var ctx = {
						controller : this,
						vnode : vnode,
						view : nodeView,
						data : this._callbackData
					};
					behavior.onselect(ctx);
				}
			} else {
				if ($.isFunction(behavior.onunselect)) {
					var ctx = {
						controller : this,
						vnode : vnode,
						view : nodeView,
						data : this._callbackData
					};
					behavior.onunselect(ctx);
				}
			}
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_removeNode : function(vnode, isUnbindOnly) {
			var visibleNode = this._visibleNodes[vnode[this._nodeIdKey]];
			var nodeView = visibleNode.view;
			var behavior = visibleNode.behavior;

			if ($.isFunction(behavior.onunbind)) {
				var unbindCtx = {
					controller : this,
					vnode : vnode,
					view : nodeView,
					data : this._callbackData
				};
				behavior.onunbind(unbindCtx);
			}

			if (!isUnbindOnly) {
				for ( var i = 0, count = this._layerRenderers.length; i < count; i++) {
					var renderer = this._layerRenderers[i];
					var layerName = renderer.name;

					if (!nodeView[layerName]) {
						// このレイヤに対応するビューが存在しない場合はスキップ
						// 背景レイヤなどの場合にここに来る
						continue;
					}

					var layerElem = this._layerRootElementMap[layerName].rootElement;

					if (renderer.type == 'svg') {
						layerElem.childNodes[0]
								.removeChild(nodeView[layerName]);
					} else {
						// divの場合
						layerElem.removeChild(nodeView[layerName]);
					}
				}

				this._nodeViewPool.returnObject(nodeView);
				this._nodeBehaviorPool.returnObject(behavior);
			}

			delete this._visibleNodes[vnode[this._nodeIdKey]];
			visibleNode.node = null;

			for ( var visibleEdgeKey in this._visibleEdges) {
				var visibleEdge = this._visibleEdges[visibleEdgeKey];
				var e = visibleEdge.edge;
				var endpoint = this._graph.getEndpointNodeId(visibleEdgeKey);

				// TODO 現在は、「両方のノードが可視範囲から外れたらエッジも消す」としている。そのため、
				// 可視範囲を横切るエッジが描画されない。
				if (!(endpoint.fromId in this._visibleNodes)
						&& !(endpoint.toId in this._visibleNodes)) {
					this._removeVisibleEdge(e);
				}
			}

			return visibleNode;
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_drawEdges : function() {
			// TODO これ自体を_addCommandLowで実行している

			for ( var edgeKey in this._vedges) {
				var vedge = this._vedges[edgeKey];

				if (edgeKey in this._visibleEdges) {
					// すでに描画済みだったらスキップ
					continue;
				}

				var endpoint = this._graph.getEndpointNodeId(edgeKey);

				if ((endpoint.fromId in this._visibleNodes)
						|| (endpoint.toId in this._visibleNodes)) {
					this._addCommand(this._drawEdge, vedge);
				}
			}

			this._doCommandLoop();
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_drawEdge : function(edge) {
			if (edge.get(this._edgeIdKey) in this._visibleEdges) {
				// すでに指定されたエッジが描画されている場合は直ちに終了
				return;
			}

			var view = this._edgeViewPool.borrowObject();

			var behavior = this._edgeBehaviorPool.borrowObject();

			this._edgeLayerElement.childNodes[0].appendChild(view);

			var endpoint = this._graph.getEndpointNodeId(edge
					.get(this._edgeIdKey));
			var fromVnode = this._vnodes[endpoint.fromId];
			var toVnode = this._vnodes[endpoint.toId];

			this._visibleEdges[edge.get(this._edgeIdKey)] = {
				edge : edge,
				fromNode : fromVnode,
				toNode : toVnode,
				view : view,
				behavior : behavior
			};

			var ctx = {
				controller : this,
				vedge : edge,
				fromVnode : fromVnode,
				toVnode : toVnode,
				view : view,
				data : this._callbackData
			};
			behavior.onbind(ctx);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_removeVisibleEdge : function(edge) {
			var visibleEdge = this._visibleEdges[edge.get(this._edgeIdKey)];

			if (visibleEdge === undefined) {
				// 他のノードを取り除いたタイミングでエッジが取り除かれていればただちに終了
				return;
			}

			var fromNode = this._vnodes[edge.get(this._graph._fromNodeIdKey)];
			var toNode = this._vnodes[edge.get(this._graph._toNodeIdKey)];

			if (visibleEdge.behavior && visibleEdge.behavior.onunbind) {
				var unbindCtx = {
					controller : this,
					edge : edge,
					fromNode : fromNode,
					toNode : toNode,
					view : visibleEdge.view,
					data : this._callbackData
				};
				visibleEdge.behavior.onunbind(unbindCtx);
			}

			this._edgeLayerElement.childNodes[0].removeChild(visibleEdge.view);

			this._edgeViewPool.returnObject(visibleEdge.view);
			this._edgeBehaviorPool.returnObject(visibleEdge.behavior);
			delete this._visibleEdges[edge.get(this._edgeIdKey)];
		},

		_setSvgTransform : function(target, tx, ty, scale) {
			var x = tx, y = ty, s = scale;
			var scrollPos = this._visibleLayoutRect;
			if (tx === null) {
				x = scrollPos.x;
			}
			if (ty === null) {
				y = scrollPos.y;
			}
			if (scale === null || scale === undefined) {
				s = this._visibleLayoutRect.scale;
			}

			var transform = h5.u.str.format('scale({0}) translate({1},{2})', s,
					x, y);
			target.setAttribute('transform', transform);
		},

		_setDivTransform : function(target, tx, ty, scale) {
			var x = tx, y = ty, s = scale;
			var scrollPos = this._visibleLayoutRect;
			if (tx === null) {
				x = scrollPos.x;
			}
			if (ty === null) {
				y = scrollPos.y;
			}
			if (scale === null || scale === undefined) {
				s = this._visibleLayoutRect.scale;
			}

			var transform = h5.u.str.format(
					'scale({0}) translate({1}px,{2}px)', s, x, y);
			target.style.webkitTransform = transform;
			target.style.MozTransform = transform;
			target.style.msTransform = transform;
			target.style.msTransformOrigin = '(0,0)';
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_setTranslate : function(target, tx, ty, scale) {
			var translate = h5.u.str.format('translate({0},{1}) ', tx, ty);
			target.setAttribute('transform', translate);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_addCommandHigh : function(cmd) {
			this._rendererQueue.addHigh(h5.u.obj.argsToArray(arguments));
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_addCommand : function(cmd) {
			this._rendererQueue.addMedium(h5.u.obj.argsToArray(arguments));
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_addCommandLow : function(cmd) {
			this._rendererQueue.addLow(h5.u.obj.argsToArray(arguments));
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_executeCommand : function(cmd) {
			// FIXME cmdがundefinedの場合がある。根本原因の調査の必要あり
			if (!cmd) {
				return;
			}

			var func = cmd.shift();
			func.apply(this, cmd);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_executeImmediateCommands : function() {
			var immediateCount = this._rendererQueue
					.count(RENDERER_QUEUE_IMMEDIATE);
			for ( var i = 0; i < immediateCount; i++) {
				var cmd = this._rendererQueue.queues[RENDERER_QUEUE_IMMEDIATE][i];
				this._executeCommand(cmd);
			}
			this._rendererQueue.clear(RENDERER_QUEUE_IMMEDIATE);
		},

		/**
		 * @memberOf h5.ui.components.graph.GraphController
		 */
		_doCommandLoop : function() {
			// 即時実行レベルのコマンドはすべて実行
			this._executeImmediateCommands();

			var count = this._rendererQueue.count();
			if (count > this._MAX_COMMAND_PER_LOOP) {
				count = this._MAX_COMMAND_PER_LOOP;
			}

			for ( var i = 0; i < count; i++) {
				var cmd = this._rendererQueue.poll();
				this._executeCommand(cmd);
			}

			var hasMoreCommand = true;
			if (this._rendererQueue.count() == 0) {
				hasMoreCommand = false;
			}

			if (hasMoreCommand) {
				var that = this;
				setTimeout(function() {
					that._doCommandLoop();
				}, 0);
			} else {
				// this.renderDeferred.resolve();
			}
		},

		getNodeAt : function(clientX, clientY) {
			var actual = this._getActualTargetAt(clientX, clientY);

			if (!actual || actual.isEdge) {
				// actualがnullということは、エッジ・ノードもクリックされていない
				return null;
			}

			return {
				vnode : actual.visible.node,
				view : actual.visible.view
			};
		},

		getEdgeAt : function(clientX, clientY) {
			var actual = this._getActualTargetAt(clientX, clientY);

			if (!actual || !actual.isEdge) {
				// actualがnullということは、エッジ・ノードどちらもクリックされていない
				return null;
			}

			return {
				edge : actual.visible.edge,
				fromNode : actual.visible.fromNode,
				toNode : actual.visible.toNode,
				view : actual.visible.view
			};
		},

		_selectedNodeIds : [],

		getSelectedNodes : function() {
			var ret = [];
			var ids = this._selectedNodeIds;
			for ( var i = 0, len = ids.length; i < len; i++) {
				ret.push(this._getVnodeById(ids[i]));
			}
			return ret;
		},

		isSelectedNode : function(nodeId) {
			return $.inArray(nodeId, this._selectedNodeIds) !== -1;
		},

		toggleSelectNode : function(nodeId) {
			if (this.isSelectedNode(nodeId)) {
				this.unselectNode(nodeId);
			} else {
				this.selectNode(nodeId);
			}
		},

		/**
		 * @param isExclusive
		 *            デフォルトはfalse
		 */
		selectNode : function(nodeId, isExclusive) {
			if (this.isSelectedNode(nodeId)) {
				if (isExclusive) {
					var selIds = this._selectedNodeIds.slice(0);
					var idx = $.inArray(nodeId, selIds);
					selIds.splice(idx, 1);
					for ( var i = 0, len = selIds.length; i < len; i++) {
						this.unselectNode(selIds[i]);
					}
				}

				return;
			}

			var vnode = this._getVnodeById(nodeId);

			if (!vnode) {
				this.log.debug(MSG_NO_SUCH_NODE, nodeId);
				return;
			}

			if (isExclusive === true) {
				this.unselectNodeAll();
			}

			this._selectedNodeIds.push(nodeId);

			var visibleNode = this._visibleNodes[nodeId];
			if (visibleNode.behavior && visibleNode.behavior.onselect) {
				var ctx = {
					controller : this,
					vnode : visibleNode.node,
					view : visibleNode.view,
					data : this._callbackData
				};
				visibleNode.behavior.onselect(ctx);
			}

			this.trigger(this.EVENT_NODE_SELECT, {
				vnodes : [ vnode ]
			});
		},

		unselectNode : function(nodeId) {
			var idx = $.inArray(nodeId, this._selectedNodeIds);

			if (idx === -1) {
				return;
			}

			this._selectedNodeIds.splice(idx, 1);

			var vnode = this._getVnodeById(nodeId);

			var visibleNode = this._visibleNodes[nodeId];
			if (visibleNode && visibleNode.behavior
					&& visibleNode.behavior.onunselect) {
				var ctx = {
					controller : this,
					vnode : visibleNode.node,
					view : visibleNode.view,
					data : this._callbackData
				};
				visibleNode.behavior.onunselect(ctx);
			}

			this.trigger(this.EVENT_NODE_UNSELECT, {
				vnodes : [ vnode ]
			});
		},

		unselectNodeAll : function() {
			var unselectedNodes = this.getSelectedNodes();

			if (unselectedNodes.length === 0) {
				return;
			}

			var unselectedNodeIds = this._selectedNodeIds.slice(0);

			this._selectedNodeIds = [];

			for ( var i = 0, len = unselectedNodeIds.length; i < len; i++) {
				var nodeId = unselectedNodeIds[i];
				var visibleNode = this._visibleNodes[nodeId];
				if (visibleNode && visibleNode.behavior
						&& visibleNode.behavior.onunselect) {
					var ctx = {
						controller : this,
						vnode : visibleNode.node,
						view : visibleNode.view,
						data : this._callbackData
					};
					visibleNode.behavior.onunselect(ctx);
				}
			}

			this.trigger(this.EVENT_NODE_UNSELECT, {
				vnodes : unselectedNodes
			});
		},

		_getNodesInRegion : function(layoutX, layoutY, width, height,
				includeHidden) {

			// 可視範囲を計算
			var startLayoutX = layoutX;
			var startLayoutY = layoutY;
			var endLayoutX = startLayoutX + width;
			var endLayoutY = startLayoutY + height;

			var containerRegion = {
				left : startLayoutX,
				top : startLayoutY,
				right : endLayoutX,
				bottom : endLayoutY
			};

			var nodeIdKey = this._nodeIdKey;

			var ret = [];

			var nodeRegion = {
				left : 0,
				top : 0,
				right : 0,
				bottom : 0
			};

			// TODO 高速化の余地あり(y軸方向で事前にソートしておいて二分検索)
			for ( var i = 0, count = this._nodeSortArray.length; i < count; i++) {
				var node = this._nodeSortArray[i];
				var viewPos = node.layoutPos;

				var viewX = viewPos.x;

				if (viewX < startLayoutX) {
					continue;
				} else if (viewX > endLayoutX) {
					break;
				}

				var viewY = viewPos.y;

				if (includeHidden !== true && (node.isVisible === false)) {
					// hiddenなものは含めないように指定されていて
					// ノードが非表示状態ならスキップ
					continue;
				}

				nodeRegion.left = viewX;
				nodeRegion.top = viewY;

				var nodeSize = this.getNodeSize(node.get(nodeIdKey));
				if (nodeSize) {
					nodeRegion.right = viewX + nodeSize.width;
					nodeRegion.bottom = viewY + nodeSize.height;
				} else {
					nodeRegion.right = viewX;
					nodeRegion.bottom = viewY;
				}

				if (isIncluded(containerRegion, nodeRegion)) {
					ret.push(node);
				}
			}

			return ret;
		}
	};

	h5.core.expose(graphRenderController);

})(jQuery);