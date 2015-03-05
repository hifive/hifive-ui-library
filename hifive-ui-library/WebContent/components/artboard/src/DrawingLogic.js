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

	/**
	 * SVGの名前空間
	 */
	var XLINKNS = 'http://www.w3.org/1999/xlink';
	var XMLNS = 'http://www.w3.org/2000/svg';

	// メッセージ
	/** ドキュメントツリー上にない要素で作成したRemoveCommandを実行した時のエラーメッセージ */
	var ERR_MSG_CANNOT_REMOVE_NOT_APPENDED = 'removeはレイヤに追加されている要素のみ実行できます';

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
			DATA_IMAGE_SOURCE_ID: DATA_IMAGE_SOURCE_ID
		},
		message: {
			ERR_MSG_CANNOT_REMOVE_NOT_APPENDED: ERR_MSG_CANNOT_REMOVE_NOT_APPENDED
		}
	});
})();

//-------------------------------------------------
// 共通関数
//-------------------------------------------------
(function() {
	//------------------------------------------------------------
	// Variables
	//------------------------------------------------------------
	/** 要素に、要素の位置とサイズを持たせるときのデータ属性名 */
	var DATA_BOUNDS_OBJECT = 'bounds-object';

	/**
	 * BBoxの取得にデータ属性を使用するかどうか
	 * <p>
	 * iOS6では配置した時のBBoxしか取得できないので、移動時にdata属性に移動量を覚えておいて、それをもとにBBoxを計算する
	 * </p>
	 */
	var useDataForGetBBox = h5.env.ua.isiOS && h5.env.ua.browserVersion <= 6;

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	//--------------------------
	// Functions
	//--------------------------
	/**
	 * BBoxが正しく取得できないブラウザ用に、データ属性に位置とサイズを格納したオブジェクトを持たせる
	 *
	 * @param {DOM|jQuery} element
	 * @param {Object} bounds x,y,widht,heightを持つオブジェクト
	 */
	function setBoundsData(element, bounds) {
		$(element).data(DATA_BOUNDS_OBJECT, bounds);
	}

	/**
	 * SVGに描画された要素の位置とサイズ(x,y,height,width)を取得して返す
	 *
	 * @private
	 * @param element
	 * @returns {Object} 以下のようなオブジェクトを返します
	 *
	 * <pre class="sh_javascript">
	 * {
	 * 	x: svg要素内のx座標位置,
	 * 	y: svg要素内でのy座標位置,
	 * 	height: 要素を包含する矩形の高さ,
	 * 	width: 要素を包含する矩形の幅
	 * }
	 * </pre>
	 */
	function getBounds(element) {
		var bBox = {};
		// TODO Firefoxの場合、pathで20pxのマージンが取られることがある
		if (!useDataForGetBBox || element.tagName.toLowerCase() !== 'path') {
			// path要素の場合はiOS6でもBBoxが正しく取得できるので、getBBox()の結果を返す
			bBox = element.getBBox();
		} else {
			// データ属性の値を返す。なければgetBox()の結果を返す
			bBox = $(element).data(DATA_BOUNDS_OBJECT) || element.getBBox();
		}
		return {
			x: bBox.x,
			y: bBox.y,
			width: bBox.width,
			height: bBox.height
		};
	}

	h5.u.obj.expose('h5.ui.components.artboard', {
		useDataForGetBBox: useDataForGetBBox,
		setBoundsData: setBoundsData,
		getBounds: getBounds
	});
})();

//-------------------------------------------------
// コマンドマネージャ
//-------------------------------------------------
(function() {
	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	var ERR_MSG_CANNOT_REMOVE_NOT_APPENDED = h5.ui.components.artboard.message.ERR_MSG_CANNOT_REMOVE_NOT_APPENDED;
	var useDataForGetBBox = h5.ui.components.artboard.useDataForGetBBox;
	var setBoundsData = h5.ui.components.artboard.setBoundsData;
	var getBounds = h5.ui.components.artboard.getBounds;
	var EVENT_UNDO = h5.ui.components.artboard.consts.EVENT_UNDO;
	var EVENT_REDO = h5.ui.components.artboard.consts.EVENT_REDO;
	var EVENT_ENABLE_UNDO = h5.ui.components.artboard.consts.EVENT_ENABLE_UNDO;
	var EVENT_ENABLE_REDO = h5.ui.components.artboard.consts.EVENT_ENABLE_REDO;
	var EVENT_DISABLE_UNDO = h5.ui.components.artboard.consts.EVENT_DISABLE_UNDO;
	var EVENT_DISABLE_REDO = h5.ui.components.artboard.consts.EVENT_DISABLE_REDO;
	var EVENT_APPEND_SHAPE = h5.ui.components.artboard.consts.EVENT_APPEND_SHAPE;
	var EVENT_REMOVE_SHAPE = h5.ui.components.artboard.consts.EVENT_REMOVE_SHAPE;
	var EVENT_EDIT_SHAPE = h5.ui.components.artboard.consts.EVENT_EDIT_SHAPE;

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * コマンド
	 *
	 * @name Command
	 * @class
	 * @abstruct
	 */
	function Command() {
	// 何もしない
	}
	$.extend(Command.prototype, {
		/**
		 * コマンドの実行
		 *
		 * @memberOf Command
		 * @instance
		 * @returns {Any} コマンドの実行結果
		 */
		execute: function() {
			if (this._isExecuted) {
				return this;
			}
			var ret = this._execute();
			this._isExecuted = true;
			return ret;
		},

		/**
		 * コマンドの取り消し
		 *
		 * @memberOf Command
		 * @instance
		 * @returns {Any} コマンドの実行結果
		 */
		undo: function() {
			if (!this._isExecuted) {
				return this;
			}
			var ret = this._undo();
			this._isExecuted = false;
			return ret;
		},

		/**
		 * コンストラクタで指定したコマンドデータオブジェクトを返します
		 *
		 * @memberOf Command
		 * @instance
		 * @returns {Object} コマンドデータオブジェクト
		 */
		getCommandData: function() {
			return this._data;
		},

		/**
		 * 初期化処理
		 *
		 * @memberOf Command
		 * @private
		 * @instance
		 */
		_init: function(commandData) {
			// コマンドデータを_dataとして持っておく
			this._data = commandData;
			this._isExecuted = false;
		}
	});

	/**
	 * ユーザ定義コマンド
	 *
	 * @class
	 * @param {Object} commandData コマンドデータオブジェクト。CustomCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript">
	 * {
	 * 	execute: executeメソッドを呼んだ時に実行する関数。必須。
	 * 	undo: undoメソッドを呼んだ時に実行する関数。必須。
	 * 	margeCommand: 引数に渡されたCommandとマージする関数。指定しない場合はマージせずにfalseを返す。
	 * }
	 * </pre>
	 *
	 * @class
	 * @extends Command
	 * @param {Object} commandData コマンドデータオブジェクト
	 */
	function CustomCommand(commandData) {
		this._init(commandData);
		this._execute = function() {
			return commandData.execute.call(commandData);
		};
		this._undo = function() {
			return commandData.undo.call(commandData);
		};
		if (commandData.margeCustomCommand) {
			// ユーザ定義があれば上書き
			this.margeCustomCommand = function() {
				commandData.margeCustomCommand.call(commandData);
			};
		}
	}
	$.extend(CustomCommand.prototype, Command.prototype);


	/**
	 * DRShape取り扱うコマンド
	 * <p>
	 * このクラスは抽象クラスです。以下のクラスがこのクラスを実装しています。
	 * </p>
	 * <ul>
	 * <li>AppendCommand
	 * <li>RemoveCommand
	 * </ul>
	 * <p>
	 * _execute時にイベントオブジェクトを生成して戻り値として返します。
	 * </p>
	 *
	 * @name DRShapeCommand
	 * @class DRShapeCommand
	 * @abstruct
	 * @extends Command
	 * @param {Object} commandData コマンドデータオブジェクト。以下のプロパティは必須です。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: DRShapeオブジェクト
	 * }
	 * </code></pre>
	 */
	function DRShapeCommand(commandData) {
	// 抽象クラスのため何もしない
	}
	$.extend(DRShapeCommand.prototype, Command.prototype, {
		/**
		 * コマンドと紐づくDRShapeオブジェクトを取得する
		 *
		 * @memberOf DRShapeCommand
		 * @instance
		 * @returns {DRShape}
		 */
		getShape: function() {
			return this._data.shape;
		}
	});

	/**
	 * 要素の追加を行うコマンド
	 *
	 * @name AppendCommand
	 * @class
	 * @extends DRShapeCommand
	 * @param {Object} commandData コマンドデータオブジェクト。AppendCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: 追加するDRShape
	 * 	layer: DRShapeの要素を追加する対象の要素
	 * }
	 * </code></pre>
	 */
	function AppendCommand(commandData) {
		this._init(commandData);
	}
	$.extend(AppendCommand.prototype, DRShapeCommand.prototype, {
		/**
		 * @memberOf AppendCommand
		 * @private
		 * @instance
		 * @see Command#execute
		 */
		_execute: function() {
			this._data.layer.appendChild(this.getShape().getElement());
			return {
				type: EVENT_APPEND_SHAPE,
				target: this.getShape(),
				layer: this._data._layer
			};
		},

		/**
		 * @memberOf AppendCommand
		 * @private
		 * @instance
		 * @see Command#undo
		 */
		_undo: function() {
			this._data.layer.removeChild(this.getShape().getElement());
			return {
				type: EVENT_REMOVE_SHAPE,
				target: this.getShape(),
				layer: this._data._layer
			};
		}
	});

	/**
	 * 要素の削除を行うコマンド
	 *
	 * @name RemoveCommand
	 * @class
	 * @extends DRShapeCommand
	 * @param {Object} commandData コマンドデータオブジェクト。RemoveCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: 削除するDRShape
	 * }
	 * </code></pre>
	 */
	function RemoveCommand(commandData) {
		this._init(commandData);
		this._undoData = {};
	}
	$.extend(RemoveCommand.prototype, DRShapeCommand.prototype, {
		/**
		 * @memberOf RemoveCommand
		 * @private
		 * @instance
		 * @see Command#execute
		 */
		_execute: function() {
			var shape = this.getShape();
			var parent = shape.getElement().parentNode;
			if (!parent) {
				throw new Error(ERR_MSG_CANNOT_REMOVE_NOT_APPENDED);
			}
			this._undoData.parent = parent;
			parent.removeChild(shape.getElement());
			return {
				type: EVENT_REMOVE_SHAPE,
				target: shape,
				layer: parent
			};
		},

		/**
		 * @memberOf RemoveCommand
		 * @private
		 * @instance
		 * @see Command#undo
		 */
		_undo: function() {
			var shape = this.getShape();
			var parent = this._undoData.parent;
			parent.appendChild(shape.getElement());
			return {
				type: EVENT_APPEND_SHAPE,
				target: shape,
				layer: parent
			};
		}
	});

	/**
	 * スタイルの変更を行うコマンド
	 *
	 * @name StyleCommand
	 * @class
	 * @extends DRShapeCommand
	 * @param {Object} commandData コマンドデータオブジェクト。StyleCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: スタイルを適用するDRShape
	 * 	style: 適用するスタイルオブジェクト
	 * }
	 * </code></pre>
	 */
	function StyleCommand(commandData) {
		this._init(commandData);
		this._undoData = {};
	}
	$.extend(StyleCommand.prototype, DRShapeCommand.prototype, {
		/**
		 * @memberOf StyleCommand
		 * @private
		 * @instance
		 * @see Command#execute
		 */
		_execute: function() {
			var before = this._undoData.beforeStyle;
			var after = this._undoData.afterStyle;
			var shape = this.getShape();
			var prop = this._data.propertyName;
			var oldValue = shape[prop];
			if (after && before) {
				// 一度でも実行していれば、適用前、適用後のスタイルは知っているので
				// そのまま適用
				$(shape.getElement()).css(after);
			} else {
				before = {};
				after = {};
				var element = shape.getElement();
				for ( var p in this._data.style) {
					// camelCaseにして、jQueryを使わずにスタイルを適用する
					// (jQueryを使った場合にopacityの値に'px'が足されてしまい、Firefoxだと値が反映されない)
					var camel = $.camelCase(p);
					before[camel] = element.style[camel];
					element.style[camel] = this._data.style[p];
					// 設定した後の値を再取得してafterに覚えておく
					after[camel] = element.style[camel];
				}
				this._undoData.beforeStyle = before;
				this._undoData.afterStyle = after;
			}
			var newValue = shape[prop];
			return {
				type: EVENT_EDIT_SHAPE,
				target: shape,
				prop: prop,
				oldValue: oldValue,
				newValue: newValue
			};
		},

		/**
		 * @memberOf StyleCommand
		 * @private
		 * @instance
		 * @see Command#undo
		 */
		_undo: function() {
			var before = this._undoData.beforeStyle;
			var shape = this.getShape();
			var prop = this._data.propertyName;
			var oldValue = shape[prop];
			$(shape.getElement()).css(before);
			var newValue = shape[prop];
			return {
				type: EVENT_EDIT_SHAPE,
				target: shape,
				prop: prop,
				oldValue: oldValue,
				newValue: newValue
			};
		}
	});

	/**
	 * 属性値の変更を行うコマンド
	 *
	 * @name AttrCommand
	 * @class
	 * @extends DRShapeCommand
	 * @param {Object} commandData コマンドデータオブジェクト。AttrCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: スタイルを適用するDRShape
	 * 	attr: 適用する属性値オブジェクト(属性名をキーにして属性値を値に持つオブジェクト),
	 * 	attrNS: 適用する名前空間付属性(ns,name,valueをキーにそれぞれの値を持つオブジェクト)の配列
	 * }
	 * </code></pre>
	 */
	function AttrCommand(commandData) {
		this._init(commandData);
		this._undoData = {};
	}
	$.extend(AttrCommand.prototype, DRShapeCommand.prototype, {
		/**
		 * @memberOf AttrCommand
		 * @private
		 * @instance
		 * @see Command#execute
		 */
		_execute: function() {
			var attr = this._data.attr;
			var attrNS = this._data.attrNS;
			var shape = this.getShape();
			var prop = this._data.propertyName;
			var oldValue = shape[prop];
			var element = shape.getElement();
			var beforeAttr, beforeAttrNS;
			if (attr) {
				beforeAttr = {};
				for ( var p in attr) {
					beforeAttr[p] = element.getAttribute(p);
					element.setAttribute(p, attr[p]);
				}
			}
			if (attrNS) {
				beforeAttrNS = [];
				for (var i = 0, l = attrNS.length; i < l; i++) {
					var at = attrNS[i];
					beforeAttrNS.push({
						ns: at.ns,
						name: at.name,
						value: element.getAttributeNS(at.ns, at.name)
					});
					element.setAttributeNS(at.ns, at.name, at.value);
				}
			}
			this._beforeAttr = {
				attr: beforeAttr,
				attrNS: beforeAttrNS
			};

			// pathのBBoxが自動更新されないブラウザについて、自分で計算してelementに持たせる
			if (useDataForGetBBox && element.tagName.toLowerCase() === 'path') {
				var bBox = getBounds(element);
				this._beforeBounds = bBox;
				var beforeD = beforeAttr.d;
				var afterD = element.getAttribute('d');
				var beforeXY = beforeD.match(/M -?\d* -?\d*/)[0].split(' ').slice(1);
				var afterXY = afterD.match(/M -?\d* -?\d*/)[0].split(' ').slice(1);
				var dx = parseInt(afterXY[0]) - parseInt(beforeXY[0]);
				var dy = parseInt(afterXY[1]) - parseInt(beforeXY[1]);
				bBox.x += dx;
				bBox.y += dy;
				setBoundsData(element, bBox);
			}
			var newValue = shape[prop];
			return {
				type: EVENT_EDIT_SHAPE,
				target: shape,
				prop: prop,
				oldValue: oldValue,
				newValue: newValue
			};
		},

		/**
		 * @memberOf AttrCommand
		 * @private
		 * @instance
		 * @see Command#undo
		 */
		_undo: function() {
			var attr = this._beforeAttr.attr;
			var attrNS = this._beforeAttr.attrNS;
			var shape = this.getShape();
			var prop = this._data.propertyName;
			var oldValue = shape[prop];
			var element = shape.getElement();
			if (attr) {
				for ( var p in attr) {
					element.setAttribute(p, attr[p]);
				}
			}
			if (attrNS) {
				for (var i = 0, l = attrNS.length; i < l; i++) {
					var at = attrNS[i];
					element.setAttributeNS(at.ns, at.name, at.value);
				}
			}
			// pathのBBoxが自動更新されないブラウザについて、自分で計算してelementに持たせる
			if (useDataForGetBBox && element.tagName.toLowerCase() === 'path') {
				setBoundsData(element, this._beforeBounds);
			}
			var newValue = shape[prop];
			return {
				type: EVENT_EDIT_SHAPE,
				target: shape,
				prop: prop,
				oldValue: oldValue,
				newValue: newValue
			};
		}
	});

	/**
	 * 複数のCommandを一つのコマンドとして扱うコマンド
	 *
	 * @name SequenceCommand
	 * @class
	 * @extends Command
	 * @param {Command[]} [commands=[]] Commandの配列
	 */
	function SequenceCommand(commands) {
		this._commands = commands || [];
	}
	$.extend(SequenceCommand.prototype, Command.prototype, {
		/**
		 * @memberOf SequenceCommand
		 * @private
		 * @instance
		 * @see Command#execute
		 * @returns {Array} 各コマンドのexecute()の戻り値の配列
		 */
		_execute: function() {
			var ret = [];
			for (var i = 0, l = this._commands.length; i < l; i++) {
				ret.push(this._commands[i].execute());
			}
			return ret;
		},

		/**
		 * @memberOf SequenceCommand
		 * @private
		 * @instance
		 * @see Command#undo
		 * @returns {Array} 各コマンドのundo()の戻り値の配列
		 */
		_undo: function() {
			var ret = [];
			for (var i = this._commands.length - 1; i >= 0; i--) {
				ret.push(this._commands[i].undo());
			}
			return ret;
		},

		/**
		 * コマンドの追加
		 *
		 * @memberOf SequenceCommand
		 * @instance
		 * @param {Command}
		 */
		push: function(command) {
			this._commands.push(command);
		},

		/**
		 * 内部コマンドの取得
		 *
		 * @memberOf SequenceCommand
		 * @instance
		 * @returns {Commands[]}
		 */
		getInnerCommands: function() {
			return this._commands;
		}
	});

	/**
	 * コマンドマネージャ
	 *
	 * @name CommandManager
	 * @class
	 * @mixes EventDispatcher
	 */
	function CommandManager() {
		// 空コンストラクタ
		this._index = 0;
		this._history = [];
	}
	h5.mixin.eventDispatcher.mix(CommandManager.prototype);
	$.extend(CommandManager.prototype, {
		/**
		 * コマンドを追加
		 * <p>
		 * コマンドが配列で渡された場合は一連のコマンドを一つのコマンドとして扱います
		 * </p>
		 *
		 * @memberOf CommandManager
		 * @instance
		 * @param {Command} command
		 */
		append: function(command) {
			var history = this._history;
			var index = this._index;
			if (index !== history.length) {
				// currentがhistoryの最後尾を見ていない時は、current以降の履歴を削除
				history.splice(index);
				// 最後尾を見ていない時(==今までREDO可能だったとき)にREDO不可になったことを通知
				this.dispatchEvent({
					type: EVENT_DISABLE_REDO
				});
			}
			// 最後尾に追加
			history.push(command);
			// indexを更新
			this._index++;
			if (index === 0) {
				// 0番目を見ていた時は、UNDO可能になったことを通知
				this.dispatchEvent({
					type: EVENT_ENABLE_UNDO
				});
			}
		},

		/**
		 * 一つ戻す
		 *
		 * @memberOf CommandManager
		 * @instance
		 * @returns {Any} 実行したコマンドのundoの戻り値
		 */
		undo: function() {
			var history = this._history;
			var index = this._index;
			var command = history[index - 1];
			if (!command) {
				return;
			}
			// undo実行
			var returnValues = command.undo();
			// undoされたことをイベントで通知
			this.dispatchEvent({
				type: EVENT_UNDO,
				returnValues: returnValues
			});

			this._index--;
			// 元々redoできなかった場合(最後を見ていた場合)はredo可能になったことを通知
			if (index === history.length) {
				this.dispatchEvent({
					type: EVENT_ENABLE_REDO
				});
			}
			// 1番目を見ていた時は、今回のundoでundo不可になったことを通知
			if (index === 1) {
				this.dispatchEvent({
					type: EVENT_DISABLE_UNDO
				});
			}
			return returnValues;
		},

		/**
		 * 一つ進む
		 *
		 * @memberOf CommandManager
		 * @instance
		 * @returns {Any} 実行したコマンドのexecuteの戻り値
		 */
		redo: function() {
			var history = this._history;
			var index = this._index;
			var command = history[index];
			if (!command) {
				return;
			}
			// redo実行
			var returnValues = command.execute();
			// redoされたことをイベントで通知
			this.dispatchEvent({
				type: EVENT_REDO
			});

			this._index++;
			// 元々undeできなかった場合(0番目を見ていた場合はundo可能になったことを通知
			if (index === 0) {
				this.dispatchEvent({
					type: EVENT_ENABLE_UNDO
				});
			}
			// 最後の一個前を見ていた時は、今回のredoでredo不可になったことを通知
			if (index === history.length - 1) {
				this.dispatchEvent({
					type: EVENT_DISABLE_REDO
				});
			}
			return returnValues;
		},

		/**
		 * 管理対象のコマンドを全て管理対象から外す
		 *
		 * @memberOf CommandManager
		 * @instance
		 */
		clearAll: function() {
			var index = this._index;
			var historyLength = this._history.length;
			this._history.splice(0, 0);
			this._index = 0;
			// undo不可になったことを通知
			if (index !== 0) {
				this.dispatchEvent({
					type: EVENT_DISABLE_UNDO
				});
			}
			// redo不可になったことを通知
			if (index < historyLength) {
				this.dispatchEvent({
					type: EVENT_DISABLE_REDO
				});
			}
		}
	});

	h5.u.obj.expose('h5.ui.components.artboard', {
		Command: Command,
		CustomCommand: CustomCommand,
		AppendCommand: AppendCommand,
		RemoveCommand: RemoveCommand,
		StyleCommand: StyleCommand,
		AttrCommand: AttrCommand,
		SequenceCommand: SequenceCommand,
		CommandManager: CommandManager
	});
})();

(function() {
	//------------------------------------------------------------
	// Const
	//------------------------------------------------------------
	/**
	 * SVGの名前空間
	 */
	var XLINKNS = h5.ui.components.artboard.consts.XLINKNS;

	/**
	 * italic体で描画した時に斜体になるかどうかの判定結果マップ
	 */
	var italicDrawableMap = {};

	//------------------------------------------------------------
	// Functions
	//------------------------------------------------------------
	/**
	 * 指定されたフォントでcanvasにitalic指定で描画した時に、斜体になるか
	 * <p>
	 * Firefoxでは斜体フォントが無いとitalic指定しても描画できないので、結果はフォントによる
	 * </p>
	 * <p>
	 * それ以外のブラウザでは斜体フォントが無くてもシミュレートして描画するので、結果は常にtrue
	 * </p>
	 *
	 * @param {String} fontFamily フォント名
	 * @returns {Boolean}
	 */
	function canDrawItalicText(fontFamily) {
		if (italicDrawableMap.hasOwnProperty(fontFamily)) {
			return italicDrawableMap[fontFamily];
		}
		// italicを指定する場合とそうでない場合でcanvasに実際に描画してみて、差異があるかどうかで判定
		var normalCanvas = document.createElement('canvas');
		var italicCanvas = document.createElement('canvas');
		var size = {
			width: 10,
			height: 10
		};
		$(normalCanvas).attr(size);
		$(italicCanvas).attr(size);
		var normalCtx = normalCanvas.getContext('2d');
		var italicCtx = italicCanvas.getContext('2d');
		var font = '12px ' + fontFamily;
		normalCtx.font = font;
		italicCtx.font = 'italic ' + font;
		normalCtx.fillText('|', 5, 10);
		italicCtx.fillText('|', 5, 10);
		var normalPixelArray = normalCtx.getImageData(0, 0, 10, 10).data;
		var italicPixelArray = italicCtx.getImageData(0, 0, 10, 10).data;
		var length = normalPixelArray.length;
		for (var i = 0; i < length; i++) {
			if (normalPixelArray[i] !== italicPixelArray[i]) {
				italicDrawableMap[fontFamily] = true;
				return true;
			}
		}
		italicDrawableMap[fontFamily] = false;
		return false;
	}

	//------------------------------------------------------------
	// Logic
	//------------------------------------------------------------
	/**
	 * canvasの画像変換を行うロジック
	 *
	 * @class
	 * @name h5.ui.components.artboard.logic.CanvasConvertLogic
	 */
	var canvasConvertLogic = {
		__name: 'h5.ui.components.artboard.logic.CanvasConvertLogic',

		/**
		 * svg要素の中身をcanvasに描画します。
		 * <p>
		 * このメソッドはプロミスを返します。画像(image要素)が使用されている場合は非同期になる場合があります。
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.CanvasConvertLogic
		 * @instance
		 * @param {SVG} svgElement svg要素
		 * @param {Canvas} canvas canvas要素
		 * @param {Object} [processParameter.simulateItalic = false]
		 *            italic体が描画できるかどうかチェックして描画できない場合に変形してシミュレートするかどうか
		 */
		drawSVGToCanvas: function(svgElement, canvas, processParameter) {
			var ctx = canvas.getContext('2d');
			var simulateItalic = processParameter || processParameter.simulateItalic;
			// h5.async.loopを使って非同期処理がある場合に待機してから次のループを実行するようにしている
			var elements = $(svgElement).children().toArray();
			var promise = h5.async.loop(elements, function(index, element) {
				switch (element.tagName.toLowerCase()) {
				case 'path':
					var pathData = element.getAttribute('d');
					var stroke = element.getAttribute('stroke');
					var style = element.style;
					// strokeの設定
					ctx.save();
					ctx.strokeStyle = style.stroke;
					ctx.lineWidth = parseInt(style.strokeWidth);
					ctx.lineJoin = style.strokeLinejoin;
					ctx.lineCap = style.strokeLinecap;
					ctx.globalAlpha = style.strokeOpacity;

					// 描画
					ctx.beginPath();
					// 'M x1 y1 l x2 y2 x3 y3 ...' という記述であることを前提にしている
					// IEの場合、d属性の値を取得すると、'M x1 y1 l x2 y2 l x3 y3 l...'となっているため
					// 各ブラウザ共通になるようにMとlを最初に取り除く
					var pathDataArray = pathData.replace(/M |l /g, '').split(' ');
					var firstX = parseInt(pathDataArray[0]);
					var firstY = parseInt(pathDataArray[1]);
					ctx.moveTo(firstX, firstY);
					var preX = firstX;
					var preY = firstY;
					// x,yのデータを同時に取り出すので２つずつカウント
					for (var index = 2, l = pathDataArray.length; index < l; index += 2) {
						var x = preX + parseInt(pathDataArray[index]);
						var y = preY + parseInt(pathDataArray[index + 1]);
						ctx.lineTo(x, y);
						preX = x;
						preY = y;
					}
					ctx.stroke();
					ctx.closePath();
					ctx.restore();
					break;
				case 'rect':
					var x = parseInt(element.getAttribute('x'));
					var y = parseInt(element.getAttribute('y'));
					var w = parseInt(element.getAttribute('width'));
					var h = parseInt(element.getAttribute('height'));
					var style = element.style;

					// fillの設定
					var fill = style.fill;
					var isFill = fill && fill !== 'none';
					if (isFill) {
						ctx.save();
						ctx.fillStyle = style.fill;
						ctx.globalAlpha = style.fillOpacity;
						var fillMargin = parseInt(style.strokeWidth) / 2;
						// fillRectで描画
						ctx.fillRect(x, y, w + fillMargin / 8 - 1, h + fillMargin / 8 - 1);
						ctx.restore();
					}

					// strokeの設定
					ctx.save();
					ctx.strokeStyle = style.stroke;
					ctx.lineWidth = parseInt(style.strokeWidth);
					ctx.lineJoin = style.strokeLinejoin;
					ctx.globalAlpha = style.strokeOpacity;
					// strokeRectで描画
					ctx.strokeRect(x, y, w, h);
					ctx.restore();
					break;
				case 'ellipse':
					var cx = element.getAttribute('cx');
					var cy = element.getAttribute('cy');
					var rx = element.getAttribute('rx');
					var ry = element.getAttribute('ry');
					var style = element.style;

					var sx = rx > ry ? rx / ry : 1;
					var sy = rx > ry ? 1 : ry / rx;
					ctx.save();
					ctx.translate(cx, cy);
					ctx.scale(sx, sy);

					// fillの設定
					var fill = style.fill;
					var isFill = fill && fill !== 'none';
					ctx.beginPath();
					if (isFill) {
						ctx.fillStyle = fill;
						ctx.globalAlpha = style.fillOpacity;
						ctx.arc(0, 0, rx > ry ? ry : rx, 0, Math.PI * 2, true);
						ctx.fill();
					}

					// strokeの設定
					ctx.strokeStyle = style.stroke;
					ctx.lineWidth = parseInt(style.strokeWidth);
					ctx.globalAlpha = style.strokeOpacity;

					ctx.arc(0, 0, rx > ry ? ry : rx, 0, Math.PI * 2, true);
					ctx.scale(1 / sx, 1 / sy);
					ctx.translate(-cx, -cy);
					ctx.globalAlpha = this._strokeOpacity;
					ctx.stroke();
					ctx.closePath();
					ctx.restore();
					break;
				case 'text':
					var $element = $(element);
					var x = parseFloat(element.getAttribute('x'));
					var y = parseFloat(element.getAttribute('y'));
					var fill = element.getAttribute('fill');
					var opacity = element.getAttribute('opacity');
					var fontFamily = element.getAttribute('font-family');
					var fontSize = parseFloat(element.getAttribute('font-size'));
					var fontWeight = $element.css('font-weight');
					var fontStyle = $element.css('font-style');
					var textContent = $element.text();

					ctx.save();
					ctx.font = h5.u.str.format('{0} {1} {2}px {3}', fontStyle, fontWeight,
							fontSize, fontFamily);
					ctx.fillStyle = fill;
					ctx.globalAlpha = opacity;
					// italic体のtransformによるシミュレートが必要かどうか
					var shouldTransform = simulateItalic && fontStyle.indexOf('italic') !== -1
							&& !canDrawItalicText(fontFamily);
					if (shouldTransform) {
						// シミュレートが必要な場合は変形
						ctx.setTransform(1, 0.0, -1 / 3, 1, y / 3, 0);
						ctx.font = ctx.font.replace('italic', '');
						ctx.fillText(textContent, x, y);
						// 変形を元に戻す
						ctx.setTransform(1, 0, 0, 1, 0, 0);
					} else {
						ctx.fillText(textContent, x, y);
					}

					// 下線、鎖線はstrokeを使って描画
					var fontStyle = $element.css('text-decoration');
					var lineThrough = fontStyle.indexOf('line-through') !== -1;
					var underline = fontStyle.indexOf('underline') !== -1;
					if (underline || lineThrough) {
						// サイズを取得
						var measure = ctx.measureText(textContent);
						var width = measure.width;
						var height = fontSize;
						ctx.strokeStyle = fill;
						ctx.lineWidth = Math.floor(parseInt(fontSize) * 0.05 + 1);
						// 下線
						if (underline) {
							ctx.beginPath();
							ctx.moveTo(x, y + height / 10);
							ctx.lineTo(x + width, y + height / 10);
							ctx.stroke();
						}
						// 鎖線
						if (lineThrough) {
							ctx.beginPath();
							ctx.moveTo(x, y - height * 0.3);
							ctx.lineTo(x + width, y - height * 0.3);
							ctx.stroke();
						}
					}
					ctx.restore();
					break;
				case 'image':
					var x = parseInt(element.getAttribute('x'));
					var y = parseInt(element.getAttribute('y'));
					var w = parseInt(element.getAttribute('width'));
					var h = parseInt(element.getAttribute('height'));
					var src = element.getAttributeNS(XLINKNS, 'href');
					var tmpImg = document.createElement('img');
					var imgDfd = h5.async.deferred();
					tmpImg.onload = (function(_imgDfd, _x, _y, _w, _h) {
						return function() {
							ctx.drawImage(this, _x, _y, _w, _h);
							_imgDfd.resolve();
						};
					})(imgDfd, x, y, w, h);
					tmpImg.src = src;
					// 画像の場合は非同期になる
					return imgDfd.promise();
				}
			});
			return promise;
		},
		/**
		 * canvasに描画されている図形を画像データにして返します
		 * <p>
		 * このメソッドはプロミスを返し、非同期で画像のデータURLを返します。画像が使用されている場合は非同期になる場合があります。
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.CanvasConvertLogic
		 * @instance
		 * @param {String} returnType imgage/png, image/jpeg, image/svg+xml のいずれか
		 * @param {Object} processParameter 第1引数にimage/jpegを指定した場合、第2引数は0.0～1.0の範囲で品質レベルを指定
		 * @returns {Promise} doneハンドラに'data:'で始まる画像データURLを渡します
		 */
		toDataURL: function(canvas, returnType, encoderOptions) {
			return canvas.toDataURL(returnType, encoderOptions);
		}
	};
	h5.core.expose(canvasConvertLogic);
})();

(function() {
	//------------------------------------------------------------
	// Const
	//------------------------------------------------------------

	/**
	 * 描画した図形のIDを保持するデータ属性名
	 */
	var DATA_SHAPE_ID = 'shapeId';
	var DATA_ELEMENT_TYPE = 'elementType';

	// エラーメッセージ
	var ERR_MSG_DRAGSESSION_DISABLED = '終了したDragSessionのメソッドは呼べません';

	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	var XMLNS = h5.ui.components.artboard.consts.XMLNS;
	var XLINKNS = h5.ui.components.artboard.consts.XLINKNS;
	var CustomCommand = h5.ui.components.artboard.CustomCommand;
	var AppendCommand = h5.ui.components.artboard.AppendCommand;
	var RemoveCommand = h5.ui.components.artboard.RemoveCommand;
	var StyleCommand = h5.ui.components.artboard.StyleCommand;
	var AttrCommand = h5.ui.components.artboard.AttrCommand;
	//	var SequenceCommand = h5.ui.components.artboard.SequenceCommand;
	//	var CommandManager = h5.ui.components.artboard.CommandManager;
	var getBounds = h5.ui.components.artboard.getBounds;
	var DATA_IMAGE_SOURCE_ID = h5.ui.components.artboard.consts.DATA_IMAGE_SOURCE_ID;

	//------------------------------------------------------------
	// Functions
	//------------------------------------------------------------
	/**
	 * 要素のスタイル定義を取得
	 *
	 * @private
	 * @param {DOM} element
	 * @returns {Object}
	 */
	function getStyleDeclaration(element) {
		var style = element.style;
		var styleDeclaration = {};
		// 値の記述してあるスタイルを取得
		for (var j = 0, len = style.length; j < len; j++) {
			var p = style[j];
			styleDeclaration[p] = style.getPropertyValue(p);
		}
		return styleDeclaration;
	}

	/**
	 * 要素のデータ属性を取得
	 *
	 * @private
	 * @param {DOM} element
	 * @returns {Object}
	 */
	function getDataAttr(element) {
		return $(element).data();
	}

	//--------------------------------------------
	// エレメントからCommandの作成
	//--------------------------------------------
	/**
	 * タグ名と属性値から要素を作成(必要なクラスを追加する)
	 *
	 * @private
	 * @param tagName
	 * @param data
	 * @returns 作成した要素
	 */
	function createSvgDrawingElement(tagName, data) {
		var elem = document.createElementNS(XMLNS, tagName);
		$(elem).attr(data.attr);
		if (data.attrNS) {
			var attrNS = data.attrNS;
			for (var i = 0, l = attrNS.length; i < l; i++) {
				var attr = attrNS[i];
				elem.setAttributeNS(attr.ns, attr.name, attr.value);
			}
		}
		if (data.style) {
			$(elem).css(data.style);
		}
		return elem;
	}

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * セーブデータ
	 *
	 * @class
	 * @name DrawingSaveData
	 * @param {DRShape[]} shapes 保存するShapeの配列
	 * @param {Object} backgroundData 背景情報
	 */
	function DrawingSaveData(shapes, backgroundData) {
		var sirializableShapes = [];
		for (var i = 0, l = shapes.length; i < l; i++) {
			sirializableShapes.push(shapes[i].serialize());
		}
		/**
		 * セーブされたデータ
		 * <p>
		 * 以下のようなデータを持つオブジェクトです
		 *
		 * <pre>
		 * {
		 * 	version: セーブデータのバージョン,
		 * 	shapes: [shapeデータの配列]
		 * }
		 * </pre>
		 *
		 * shapeデータは、以下のようなデータです
		 *
		 * <pre>
		 * {
		 * 	type: ['path' | 'rect' | 'ellipse' | 'image' | 'text'],
		 * 	data: (typeごとに異なります)
		 * }
		 * </pre>
		 *
		 * </p>
		 *
		 * @memberOf DrawingSaveData
		 * @name saveData
		 * @type {Object}
		 */
		this.saveData = {
			version: this.version,
			shapes: sirializableShapes,
			background: $.extend({}, backgroundData)
		};
	}
	DrawingSaveData.prototype = Object.create({
		/**
		 * セーブデータ形式のバージョン
		 *
		 * @memberOf DrawingSaveData
		 */
		version: '1'
	});

	//---------------------- 図形クラスの定義ここから ----------------------
	/**
	 * 図形インスタンスのtypeを書き込み不可/列挙不可で設定(コンストラクタで設定)
	 *
	 * @param {DRShape} instance 図形インスタンス
	 * @param {String} type 図形のタイプ
	 */
	function setShapeInstanceType(instance, type) {
		Object.defineProperty(instance, 'type', {
			value: type,
			writable: false,
			enumerable: false,
			configurable: false
		});
	}

	//----------------------------
	// 図形クラス
	//----------------------------
	/**
	 * 図形クラス(抽象クラス)
	 *
	 * @class
	 * @name DRShape
	 * @abstract
	 */
	function DRShape() {
	// 抽象クラスのため何もしない
	}
	/**
	 * シリアライズされたオブジェクトからDRShapeクラス(の子クラス)を生成して返す
	 *
	 * @memberOf DRShape
	 * @static
	 * @function
	 * @param {Object} shapeData あるDRShapeについてのセーブデータ。{@link DrawingSaveData#saveData}.shapes配列の要素がshapeDataに該当します。
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 * @returns {DRShape}
	 */
	DRShape.deserialize = function(shapeData, commandManagerWrapper) {
		var type = shapeData.type;
		// エレメントの作成
		var element = createSvgDrawingElement(type, {
			attr: shapeData.attr,
			attrNS: shapeData.attrNS,
			style: shapeData.style
		});
		$(element).data(shapeData.data);
		var shape = null;
		switch (type) {
		case 'path':
			shape = new DRPath(element, commandManagerWrapper);
			break;
		case 'rect':
			shape = new DRRect(element, commandManagerWrapper);
			break;
		case 'ellipse':
			shape = new DREllipse(element, commandManagerWrapper);
			break;
		case 'image':
			shape = new DRImage(element, commandManagerWrapper);
			break;
		case 'text':
			shape = new DRText(element, commandManagerWrapper);
			break;
		}
		return shape;
	};

	$.extend(DRShape.prototype, {
		/**
		 * 初期化処理
		 *
		 * @memberOf DRShape
		 * @private
		 * @instance
		 */
		_init: function(element, commandManagerWrapper) {
			this.commandManagerWrapper = commandManagerWrapper;
			this._element = element;
			$(element).data(DATA_ELEMENT_TYPE, this.type);
		},

		/**
		 * 図形要素を取得
		 *
		 * @memberOf DRShape
		 * @instance
		 */
		getElement: function() {
			return this._element;
		},

		/**
		 * ドラッグセッションの開始
		 * <p>
		 * 図形のドラッグ操作を行うための{@link DragSession}オブジェクトを生成して返します。
		 * </p>
		 *
		 * @memberOf DRShape
		 * @instance
		 * @returns {DragSession}
		 */
		beginDrag: function() {
			return new DragSession(this, this.commandManagerWrapper);
		},

		/**
		 * 図形の位置とサイズを取得
		 *
		 * @memberOf DRShape
		 * @instance
		 * @returns {Object} x,y,width,heightを持つオブジェクト
		 */
		getBounds: function() {
			return getBounds(this.getElement());
		},

		/**
		 * レイヤ上に描画されていない図形ならisAloneはtrue、そうでないならfalseを返します
		 *
		 * @memberOf DRShape
		 * @instance
		 * @returns {Boolean}
		 */
		isAlone: function() {
			return !this._element.parentNode;
		},

		/**
		 * 図形が指定された座標と重なるかどうかを返します
		 * <p>
		 * 指定された座標と重ならない場合、または描画されていない図形ならfalseを返します
		 * </p>
		 *
		 * @memberOf DRShape
		 * @instance
		 * @param {Number} x x座標位置
		 * @param {Number} y y座標位置
		 * @returns {Boolean}
		 */
		hitTest: function(x, y) {
			if (this.isAlone()) {
				return false;
			}
			var box = this.getBounds();
			if (box.x < x && x < box.x + box.width && box.y < y && y < box.y + box.height) {
				return true;
			}
			return false;
		},

		/**
		 * 図形が指定された矩形(x,y,w,h)に含まれるかどうかを返します(交わるだけではなく完全に含まれるかどうかを判定します)
		 * <p>
		 * 指定された矩形に含まれない場合、または描画されていない図形ならfalseを返します
		 * </p>
		 *
		 * @memberOf DRShape
		 * @instance
		 * @param {Number} x 矩形の左上のx座標位置
		 * @param {Number} y 矩形の左上のy座標位置
		 * @param {Number} w 矩形の幅
		 * @param {Number} h 矩形の高さ
		 * @returns {Boolean}
		 */
		isInRect: function(x, y, w, h) {
			if (this.isAlone()) {
				return false;
			}
			var box = this.getBounds();
			if (x < box.x && box.x + box.width < x + w && y < box.y && box.y + box.height < y + h) {
				return true;
			}
			return false;
		},

		/**
		 * 図形の移動を絶対座標指定で行います
		 *
		 * @memberOf DRShape
		 * @instance
		 * @function
		 * @param {Number} x x座標位置
		 * @param {Number} y y座標位置
		 * @interface
		 */
		moveTo: function() {
			// 子クラスでの実装が必須
			throw new Error('moveToを使用する場合、子クラスでの実装が必須です');
		},

		/**
		 * 図形の移動を相対座標指定で行います
		 *
		 * @memberOf DRShape
		 * @instance
		 * @function
		 * @param {Number} x x座標位置
		 * @param {Number} y y座標位置
		 * @interface
		 */
		moveBy: function() {
			// 子クラスでの実装が必須
			throw new Error('moveToを使用する場合、子クラスでの実装が必須です');
		},

		/**
		 * 図形をシリアライズ可能なオブジェクトに変換します
		 *
		 * @memberOf DRShape
		 * @instance
		 * @function
		 * @interface
		 * @returns {Object} 各図形についてのデータオブジェクト
		 */
		serialize: function() {
			// 子クラスでの実装が必須
			throw new Error('serializeを使用する場合、子クラスでの実装が必須です');
		},

		/**
		 * エレメントのスタイルをコマンドを作って設定
		 *
		 * @memberOf DRShape
		 * @private
		 * @instance
		 * @param style
		 * @param propertyName 設定するスタイルについてのshape上のプロパティ名。editShapeイベントオブジェクトの生成に必要
		 * @returns {Command}
		 */
		_setStyle: function(style, propertyName) {
			var command = new StyleCommand({
				shape: this,
				style: style,
				propertyName: propertyName
			});
			this.commandManagerWrapper.appendCommand(command);
			return command;
		},

		/**
		 * エレメントのスタイルを取得
		 *
		 * @memberOf DRShape
		 * @private
		 * @instance
		 * @param prop
		 */
		_getStyle: function(prop) {
			return this._element.style[prop];
		},

		/**
		 * エレメントの属性をコマンドを作って設定
		 *
		 * @memberOf DRShape
		 * @private
		 * @instance
		 * @param attr
		 * @param attrNS
		 * @param propertyName 設定するスタイルについてのshape上のプロパティ名。editShapeイベントオブジェクトの生成に必要
		 * @returns {Command}
		 */
		_setAttr: function(attr, attrNS, propertyName) {
			var command = new AttrCommand({
				shape: this,
				attr: attr,
				attrNS: attrNS,
				propertyName: propertyName
			});
			this.commandManagerWrapper.appendCommand(command);
			return command;
		}

	// JSDocのみ。定義は各インスタンスのdefinePropertyで行っています
	/**
	 * 図形のタイプ
	 *
	 * @memberOf DRShape
	 * @instance
	 * @name type
	 * @type {String}
	 */
	});

	/**
	 * ストロークを持つ図形クラスのプロトタイプに、setter/getterを持つプロパティを追加
	 *
	 * @private
	 * @param {Object} proto
	 * @returns {Object} 渡されたオブジェクトにストロークを持つ図形のプロパティを追加して返す
	 */
	function mixinDRStrokeShape(proto) {
		// JSDocのみ
		/**
		 * ストロークを持つ図形についてのプロパティ定義
		 * <p>
		 * 以下のクラスがDRStrokeShapeのプロパティを持ちます(プロトタイプにmixinしています)
		 * </p>
		 * <ul>
		 * <li>{@link DRPath}
		 * <li>{@link DRRect}
		 * <li>{@link DREllipse}
		 * </ul>
		 *
		 * @mixin
		 * @name DRStrokeShape
		 */

		var props = {
			/**
			 * ストロークの色
			 * <p>
			 * このプロパティにはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 * <p>
			 * CSSカラー形式の文字列を指定します(#f00,rgb(255,0,0) など)
			 * </p>
			 *
			 * @name strokeColor
			 * @memberOf DRStrokeShape
			 * @instance
			 * @type {String}
			 */
			strokeColor: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this._getStyle('stroke');
				},
				set: function(val) {
					// 再描画
					this._setStyle({
						'stroke': val
					}, 'strokeColor');
				}
			},

			/**
			 * ストロークの透明度(0～1)
			 * <p>
			 * このプロパティにはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name strokeOpacity
			 * @memberOf DRStrokeShape
			 * @instance
			 * @type {Number}
			 */
			strokeOpacity: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this._getStyle('strokeOpacity');
				},
				set: function(val) {
					// 再描画
					this._setStyle({
						'stroke-opacity': val
					}, 'strokeOpacity');
				}
			},

			/**
			 * ストロークの幅
			 * <p>
			 * このプロパティにはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name strokeWidth
			 * @memberOf DRStrokeShape
			 * @instance
			 * @type {Integer}
			 */
			strokeWidth: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this._getStyle('strokeWidth');
				},
				set: function(val) {
					// 再描画
					this._setStyle({
						'stroke-width': val
					}, 'strokeWidth');
				}
			}
		};
		Object.defineProperties(proto, props);
		return proto;
	}

	/**
	 * 塗りつぶしを持つ図形クラスのプロトタイプに、setter/getterを持つプロパティを追加
	 *
	 * @private
	 * @param {Object} proto
	 * @returns {Object} 渡されたオブジェクトに塗りつぶし図形のプロパティを追加して返す
	 */
	function mixinDRFillShape(proto) {
		/**
		 * 塗りつぶしを持つ図形についてのプロパティ定義
		 * <p>
		 * 以下のクラスがDRFillShapeのプロパティを持ちます(プロトタイプにmixinしています)
		 * </p>
		 * <ul>
		 * <li>{@link DRRect}
		 * <li>{@link DREllipse}
		 * </ul>
		 *
		 * @mixin
		 * @name DRFillShape
		 */
		var props = {
			/**
			 * 塗りつぶしの色
			 * <p>
			 * このプロパティにはsetterが設定されており、値を変更すると図形に反映されます。
			 * </p>
			 * <p>
			 * CSSカラー形式の文字列を指定します(#f00,rgb(255,0,0) など)
			 * </p>
			 *
			 * @name fillColor
			 * @memberOf DRFillShape
			 * @instance
			 * @type {String}
			 */
			fillColor: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this._getStyle('fill');
				},
				set: function(val) {
					// 再描画
					this._setStyle({
						'fill': val
					}, 'fillColor');
				}
			},
			/**
			 * 塗りつぶしの透明度(0～1)
			 * <p>
			 * このプロパティにはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name fillOpacity
			 * @memberOf DRFillShape
			 * @instance
			 * @type {Number}
			 */
			fillOpacity: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this._getStyle('fillOpacity');
				},
				set: function(val) {
					var opacity = parseFloat(val);
					this._fillOpacity = opacity;
					// 再描画
					this._setStyle({
						'fill-opacity': opacity
					}, 'fillOpacity');
				}
			}
		};
		Object.defineProperties(proto, props);
		return proto;
	}

	/**
	 * テキスト持つ図形クラスのプロトタイプに、setter/getterを持つプロパティを追加
	 *
	 * @private
	 * @param {Object} proto
	 * @returns {Object} 渡されたオブジェクトにテキスト図形のプロパティを追加して返す
	 */
	function mixinDRTextShape(proto) {
		/**
		 * テキストを持つ図形についてのプロパティ定義
		 * <p>
		 * 以下のクラスがDRTextShapeのプロパティを持ちます(プロトタイプにmixinしています)
		 * </p>
		 * <ul>
		 * <li>{@link DRText}
		 * </ul>
		 *
		 * @mixin
		 * @name DRTextShape
		 */
		var props = {
			/**
			 * テキストの色
			 * <p>
			 * このプロパティにはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 * <p>
			 * CSSカラー形式の文字列を指定します(#f00,rgb(255,0,0) など)
			 * </p>
			 *
			 * @name textColor
			 * @memberOf DRTextShape
			 * @instance
			 * @type {String}
			 */
			textColor: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this.getElement().getAttribute('fill');
				},
				set: function(val) {
					// 一緒だったら何もしない
					if (val === this.textColor) {
						return;
					}
					this._setAttr({
						fill: val
					}, null, 'textColor');
				}
			},

			/**
			 * テキストの透明度(0～1)
			 * <p>
			 * このプロパティにはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name textOpacity
			 * @memberOf DRTextShape
			 * @instance
			 * @type {Number}
			 */
			textOpacity: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this.getElement().getAttribute('opacity');
				},
				set: function(val) {
					// 一緒だったら何もしない
					if (val === this.textOpacity) {
						return;
					}
					this._setAttr({
						opacity: val
					}, null, 'textOpacity');
				}
			},

			/**
			 * テキストの文字列
			 * <p>
			 * このプロパティはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name textContent
			 * @memberOf DRTextShape
			 * @instance
			 * @type {String}
			 */
			textContent: {
				configurable: false,
				enumerable: true,
				get: function() {
					return $(this.getElement()).text();
				},
				set: function(val) {
					// 一緒だったら何もしない
					if (val === this.textContent) {
						return;
					}
					this._setTextContent(val, 'textContent');
				}
			},


			/**
			 * フォントファミリー
			 * <p>
			 * このプロパティはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name fontFamily
			 * @memberOf DRTextShape
			 * @instance
			 * @type {String}
			 */
			fontFamily: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this.getElement().getAttribute('font-family');
				},
				set: function(val) {
					// 一緒だったら何もしない
					if (val === this.fontFamily) {
						return;
					}
					this._setAttr({
						'font-family': val
					}, null, 'fontFamily');
				}
			},

			/**
			 * フォントサイズ
			 * <p>
			 * このプロパティはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name fontSize
			 * @memberOf DRTextShape
			 * @instance
			 * @type {Number}
			 */
			fontSize: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this.getElement().getAttribute('font-size');
				},
				set: function(val) {
					// 一緒だったら何もしない
					if (val === this.fontSize) {
						return;
					}
					this._setAttr({
						'font-size': val
					}, null, 'fontSize');
				}
			},

			/**
			 * フォントススタイル
			 * <p>
			 * このプロパティはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name fontStyle
			 * @memberOf DRTextShape
			 * @instance
			 * @type {Object}
			 */
			fontStyle: {
				configurable: false,
				enumerable: true,
				get: function() {
					// 文字の装飾に関する設定のみ
					return {
						'text-decoration': this._getStyle('text-decoration'),
						'font-weight': this._getStyle('font-weight'),
						'font-style': this._getStyle('font-style')
					};
				},
				set: function(val) {
					// 指定無しなら何もしない
					if (!val) {
						return;
					}
					// 今の値と同じなら何もしない
					var fontStyle = this.fontStyle;
					var existDiff = false;
					for ( var p in fontStyle) {
						if (val[p] !== fontStyle[p]) {
							existDiff = true;
							break;
						}
					}
					if (!existDiff) {
						return;
					}
					// 文字の装飾に関する設定のみ
					// (font-familyとfont-sizeは属性で設定しています)
					this._setStyle({
						'text-decoration': val['text-decoration'] || '',
						'font-weight': val['font-weight'] || '',
						'font-style': val['font-style'] || ''
					}, 'fontStyle');
				}
			}
		};
		Object.defineProperties(proto, props);
		return proto;
	}

	/**
	 * パスクラス
	 *
	 * @class
	 * @name DRPath
	 * @extends DRShape
	 * @mixes DRStrokeShape
	 * @param element {DOM} パス要素(path)
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function DRPath(element, commandManagerWrapper) {
		// typeの設定
		setShapeInstanceType(this, 'path');
		this._init(element, commandManagerWrapper);
	}
	DRPath.prototype = Object.create(DRShape.prototype);
	DRPath.constructor = DRPath;
	$.extend(mixinDRStrokeShape(DRPath.prototype), {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DRPath
		 * @instance
		 * @override
		 */
		moveTo: function(position) {
			var element = this.getElement();
			var d = element.getAttribute('d');
			var matched = d.match(this._pathMRegexp);
			if (matched) {
				var startStr = matched[0];
				var tmpAry = startStr.split(' ');
				tmpAry[1] = position.x;
				tmpAry[2] = position.y;
				d = tmpAry.join(' ') + d.slice(startStr.length);
			}
			var command = new AttrCommand({
				shape: this,
				attr: {
					d: d
				}
			});
			if (this.commandManagerWrapper) {
				this.commandManagerWrapper.appendCommand(command);
			} else {
				command.execute();
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DRPath
		 * @instance
		 * @override
		 */
		moveBy: function(position) {
			var element = this.getElement();
			var d = element.getAttribute('d');
			var matched = d.match(this._pathMRegexp);
			if (matched) {
				var startStr = matched[0];
				var tmpAry = startStr.split(' ');
				var x = parseInt(tmpAry[1]) + position.x;
				var y = parseInt(tmpAry[2]) + position.y;
				this.moveTo({
					x: x,
					y: y
				});
			}
		},

		/**
		 * シリアライズ可能なオブジェクトを生成
		 *
		 * @memberOf DRPath
		 * @instance
		 * @override
		 * @returns {Object}
		 */
		serialize: function() {
			var element = this.getElement();
			var styleDeclaration = getStyleDeclaration(element);
			var data = getDataAttr(element);
			var attr = {};
			// 復元に必要な属性を取得
			attr.d = element.getAttribute('d');
			return {
				type: this.type,
				attr: attr,
				style: styleDeclaration,
				data: data
			};
		},

		/**
		 * パスのd属性の先頭座標(Mで始まる座標指定)を取得する正規表現
		 *
		 * @memberOf DRPath
		 * @private
		 * @type {RegExp}
		 */
		_pathMRegexp: /^M -?\d+(\.\d+)? -?\d+(\.\d+)?/
	});

	/**
	 * 矩形(rect)クラス
	 *
	 * @class
	 * @name DRRect
	 * @extends DRShape
	 * @mixes DRStrokeShape
	 * @mixes DRFillShape
	 * @param {DOM} element 矩形要素(rect)
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function DRRect(element, commandManagerWrapper) {
		// typeの設定
		setShapeInstanceType(this, 'rect');
		this._init(element, commandManagerWrapper);
	}
	DRRect.prototype = Object.create(DRShape.prototype);
	DRRect.constructor = DRRect;
	$.extend(mixinDRFillShape(mixinDRStrokeShape(DRRect.prototype)), {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DRRect
		 * @instance
		 * @override
		 */
		moveTo: function(position) {
			var command = new AttrCommand({
				shape: this,
				attr: position
			});
			if (this.commandManagerWrapper) {
				this.commandManagerWrapper.appendCommand(command);
			} else {
				command.execute();
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DRRect
		 * @instance
		 * @override
		 */
		moveBy: function(position) {
			var element = this.getElement();
			var x = parseInt(element.getAttribute('x')) + position.x;
			var y = parseInt(element.getAttribute('y')) + position.y;
			return this.moveTo({
				x: x,
				y: y
			});
		},

		/**
		 * シリアライズ可能なオブジェクトを生成
		 *
		 * @memberOf DRRect
		 * @instance
		 * @returns {Object}
		 */
		serialize: function() {
			var element = this.getElement();
			var styleDeclaration = getStyleDeclaration(element);
			var data = getDataAttr(element);
			var attr = {
				x: element.getAttribute('x'),
				y: element.getAttribute('y'),
				width: element.getAttribute('width'),
				height: element.getAttribute('height')
			};
			return {
				type: this.type,
				attr: attr,
				style: styleDeclaration,
				data: data
			};
		}
	});

	/**
	 * 楕円(ellipse)クラス
	 *
	 * @class
	 * @name DREllipse
	 * @extends DRShape
	 * @mixes DRStrokeShape
	 * @mixes DRFillShape
	 * @param element 楕円要素(ellipse)
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function DREllipse(element, commandManagerWrapper) {
		// typeの設定
		setShapeInstanceType(this, 'ellipse');
		this._init(element, commandManagerWrapper);
	}
	DREllipse.prototype = Object.create(DRShape.prototype);
	DREllipse.constructor = DREllipse;
	$.extend(mixinDRFillShape(mixinDRStrokeShape(DREllipse.prototype)), {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DREllipse
		 * @instance
		 * @override
		 */
		moveTo: function(position) {
			var command = new AttrCommand({
				shape: this,
				attr: {
					cx: position.x,
					cy: position.y
				}
			});
			if (this.commandManagerWrapper) {
				this.commandManagerWrapper.appendCommand(command);
			} else {
				command.execute();
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DREllipse
		 * @instance
		 * @override
		 */
		moveBy: function(position) {
			var element = this.getElement();
			var cx = parseInt(element.getAttribute('cx')) + position.x;
			var cy = parseInt(element.getAttribute('cy')) + position.y;
			return this.moveTo({
				x: cx,
				y: cy
			});
		},

		/**
		 * シリアライズ可能なオブジェクトを生成
		 *
		 * @memberOf DREllipse
		 * @instance
		 * @returns {Object}
		 */
		serialize: function() {
			var element = this.getElement();
			var styleDeclaration = getStyleDeclaration(element);
			var data = getDataAttr(element);
			var attr = {
				cx: element.getAttribute('cx'),
				cy: element.getAttribute('cy'),
				rx: element.getAttribute('rx'),
				ry: element.getAttribute('ry')
			};
			return {
				type: this.type,
				attr: attr,
				style: styleDeclaration,
				data: data
			};
		}
	});

	/**
	 * 画像(image)クラス
	 *
	 * @class
	 * @name DRImage
	 * @extends DRShape
	 * @param element 画像要素(image)
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function DRImage(element, commandManagerWrapper) {
		// typeの設定
		setShapeInstanceType(this, 'image');
		this._init(element, commandManagerWrapper);
	}
	DRImage.prototype = Object.create(DRShape.prototype);
	DRImage.constructor = DRImage;
	$.extend(DRImage.prototype, {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DRImage
		 * @instance
		 * @override
		 */
		moveTo: function(position) {
			var command = new AttrCommand({
				shape: this,
				attr: {
					x: position.x,
					y: position.y
				}
			});
			if (this.commandManagerWrapper) {
				this.commandManagerWrapper.appendCommand(command);
			} else {
				command.execute();
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DRImage
		 * @instance
		 * @override
		 */
		moveBy: function(position) {
			var element = this.getElement();
			var x = parseInt(element.getAttribute('x')) + position.x;
			var y = parseInt(element.getAttribute('y')) + position.y;
			return this.moveTo({
				x: x,
				y: y
			});
		},

		/**
		 * シリアライズ可能なオブジェクトを生成
		 *
		 * @memberOf DRImage
		 * @instance
		 * @returns {Object}
		 */
		serialize: function() {
			var element = this.getElement();
			var styleDeclaration = getStyleDeclaration(element);
			var data = getDataAttr(element);
			// 画像パスは名前空間属性
			var attrNS = [{
				ns: XLINKNS,
				name: 'href',
				value: element.getAttributeNS(XLINKNS, 'href')
			}];
			var attr = {
				x: element.getAttribute('x'),
				y: element.getAttribute('y'),
				width: element.getAttribute('width'),
				height: element.getAttribute('height')
			};
			return {
				type: this.type,
				style: styleDeclaration,
				attr: attr,
				attrNS: attrNS,
				data: data
			};
		}
	});

	/**
	 * テキスト(text)クラス
	 *
	 * @class
	 * @name DRText
	 * @extends DRShape
	 * @param element text要素
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function DRText(element, commandManagerWrapper) {
		// typeの設定
		setShapeInstanceType(this, 'text');
		// data属性にtextの中身が設定されていればそれを適用する(deserialize時用)
		var $element = $(element);
		var text = $element.data('text-content');
		if (text) {
			$element.text(text);
		}
		this._init(element, commandManagerWrapper);
	}
	DRText.prototype = Object.create(DRShape.prototype);
	DRText.constructor = DRText;
	$.extend(mixinDRTextShape(DRText.prototype), {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DRText
		 * @instance
		 * @override
		 */
		moveTo: function(position) {
			var command = new AttrCommand({
				shape: this,
				attr: {
					x: position.x,
					y: position.y
				}
			});
			if (this.commandManagerWrapper) {
				this.commandManagerWrapper.appendCommand(command);
			} else {
				command.execute();
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DRText
		 * @instance
		 * @override
		 */
		moveBy: function(position) {
			var element = this.getElement();
			var x = parseInt(element.getAttribute('x')) + position.x;
			var y = parseInt(element.getAttribute('y')) + position.y;
			return this.moveTo({
				x: x,
				y: y
			});
		},

		/**
		 * シリアライズ可能なオブジェクトを生成
		 *
		 * @memberOf DRText
		 * @instance
		 * @returns {Object}
		 */
		serialize: function() {
			var element = this.getElement();
			var styleDeclaration = getStyleDeclaration(element);
			// textの内容をdata属性に保存
			var $element = $(element);
			$element.data('text-content', $element.text());
			var data = getDataAttr(element);
			var attr = {
				x: element.getAttribute('x'),
				y: element.getAttribute('y'),
				fill: element.getAttribute('fill'),
				opacity: element.getAttribute('opacity'),
				'font-size': element.getAttribute('font-size'),
				'font-family': element.getAttribute('font-family')
			};
			return {
				type: this.type,
				attr: attr,
				style: styleDeclaration,
				data: data
			};
		},

		/**
		 * テキストを設定
		 *
		 * @memberOf DRText
		 * @private
		 * @instance
		 * @param {String} val
		 * @param {String} prop テキストの設定を行うShapeが持つプロパティの名前
		 */
		_setTextContent: function(val, prop) {
			var shape = this;
			var element = this.getElement();
			var EVENT_EDIT_SHAPE = h5.ui.components.artboard.consts.EVENT_EDIT_SHAPE;
			var command = new CustomCommand({
				execute: function() {
					this._preVal = $(element).text();
					$(element).text(val);
					return {
						type: EVENT_EDIT_SHAPE,
						target: shape,
						prop: prop,
						oldValue: this._preVal,
						newValue: val
					};
				},
				undo: function() {
					$(element).text(this._preVal);
					return {
						type: EVENT_EDIT_SHAPE,
						prop: prop,
						target: shape,
						oldValue: val,
						newValue: this._preVal
					};
				},
				_preVal: ''
			});
			this.commandManagerWrapper.appendCommand(command);
		}
	});
	//---------------------- 図形クラスの定義ここまで ----------------------

	/**
	 * DragSession
	 * <p>
	 * 図形のドラッグ操作を行うためのクラスです。
	 * </p>
	 *
	 * @class
	 * @param {DRShape} shape
	 */
	function DragSession(shape) {
		// 1つのShapeについて1つのDragSessionしか同時に実行できない
		if (shape._currentDragSession) {
			shape._currentDragSession.cancel();
		}
		shape._currentDragSession = this;

		/**
		 * ドラッグ操作対象の図形
		 *
		 * @memberOf DragSession
		 * @instance
		 * @name shape
		 * @type Shape
		 */
		this.shape = shape;

		/**
		 * ドラッグして移動した移動量
		 *
		 * @memberOf DragSession
		 * @private
		 * @instance
		 */
		this._move = {
			x: 0,
			y: 0
		};
	}
	$.extend(DragSession.prototype, {
		/**
		 * 指定された位置に移動
		 * <p>
		 * このメソッドを使って図形を移動すると、見た目の位置のみが変化します。図形(DRShape)のmoveToやmoveByは呼ばれません。
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
		 * @param {Integer} x
		 * @param {Integer} y
		 */
		move: function(x, y) {
			if (this._disable) {
				throw new Error(ERR_MSG_DRAGSESSION_DISABLED);
			}
			this._translate(x, y);
			this._move.x = x;
			this._move.y = y;
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
		end: function() {
			if (this._disable) {
				throw new Error(ERR_MSG_DRAGSESSION_DISABLED);
			}
			// transformを元に戻す
			this._translate(0, 0);
			// 実際に移動する
			var shape = this.shape;
			shape.moveBy(this._move);
			this._disable = true;
			shape._currentDragSession = null;
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
			if (this._disable) {
				throw new Error(ERR_MSG_DRAGSESSION_DISABLED);
			}
			// transformを元に戻す
			this._translate(0, 0);
			this._disable = true;
			this.shape._currentDragSession = null;
		},

		/**
		 * transform属性を指定して要素を移動
		 *
		 * @memberOf DragSession
		 * @private
		 * @instance
		 * @param {Integer} x
		 * @param {Integer} y
		 */
		_translate: function(x, y) {
			if (this._disable) {
				throw new Error(ERR_MSG_DRAGSESSION_DISABLED);
			}
			var transformValue = h5.u.str.format('translate({0},{1})', x, y);
			$(this.shape.getElement()).attr('transform', transformValue);
		}
	});

	//------------------------------------------------------------
	// Logic
	//------------------------------------------------------------
	/**
	 * 図形の描画を行うロジック
	 *
	 * @class
	 * @name h5.ui.components.artboard.logic.DrawingLogic
	 */
	var drawingLogic = {
		/**
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 */
		__name: 'h5.ui.components.artboard.logic.DrawingLogic',

		/**
		 * 画像IDと画像パスのマップ
		 * <p>
		 * 画像の描画時(drawImageやsetBackgroundImage)に画像パスの代わりに画像IDを渡すと、このマップに登録された画像パスを使用します。
		 * 画像IDを使って画像を指定する場合はこのオブジェクトに直接登録してください。
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @type {Object}
		 */
		imageSourceMap: {},

		/**
		 * canvasの画像変換を行うロジック
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @instance
		 */
		_canvasConvertLogic: h5.ui.components.artboard.logic.CanvasConvertLogic,

		/**
		 * 図形描画領域のレイヤー
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @instance
		 */
		_shapeLayer: null,

		/**
		 * 背景画像レイヤー
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @instance
		 */
		_backgroundLayer: null,

		/**
		 * コマンド管理ロジックインスタンス
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @instance
		 * @type h5.ui.components.artboard.logic.CommandTransactionLogic
		 */
		artboardCommandManager: null,

		/**
		 * このロジックで作成した図形(Shape)と図形IDのマップ
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @instance
		 */
		_shapeMap: {},

		/**
		 * このロジックで作成した図形(Shape)のID管理用シーケンス
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @instance
		 */
		_shapeIdSequence: h5.core.data.createSequence(),

		/**
		 * 初期化処理
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {DOM} drawingElement 図形描画領域レイヤ要素
		 * @param {DOM} backgroundElement 背景領域レイヤ要素
		 * @param {ArtboardCommandLogic} [artboardCommandManager] アートボードコマンドマネージャ
		 */
		init: function(drawingElement, backgroundElement, artboardCommandManager) {
			// svg要素とcanvas要素を取得
			this._shapeLayer = drawingElement;
			this._backgroundLayer = backgroundElement;
			this.artboardCommandManager = artboardCommandManager;
		},

		/**
		 * 直前の操作を取り消します
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @returns {Any} アートボードコマンドマネージャのundo結果
		 */
		undo: function() {
			return this.artboardCommandManager.undo();
		},

		/**
		 * 直前に取り消した操作を再実行します
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @returns {Any} アートボードコマンドマネージャのredo結果
		 */
		redo: function() {
			return this.artboardCommandManager.redo();
		},

		//---------------------------------------------------------------
		// 描画オブジェクトの操作
		//---------------------------------------------------------------
		/**
		 * 図形を追加
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param layer {DOM|jQuery} 追加先レイヤ
		 */
		append: function(shape) {
			// コマンドを作成して実行
			var command = new AppendCommand({
				layer: this._shapeLayer,
				shape: shape
			});
			this._registShape(shape);
			this.artboardCommandManager.appendCommand(command);
		},

		/**
		 * 図形を削除
		 *
		 * @memberOf ShapeLayer
		 * @instance
		 * @param {DRShape} shape
		 */
		remove: function(shape) {
			var command = new RemoveCommand({
				layer: this._shapeLayer,
				shape: shape
			});
			this.artboardCommandManager.appendCommand(command);
		},

		//----------------------------
		// 各図形の描画メソッド
		//----------------------------
		/**
		 * パス(フリーハンド、直線、多角形)描画
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {Object} data
		 *
		 * <pre>
		 * {
		 * 	// SVGのpath要素のd属性に基づきます
		 * 	d: 'M (x座標開始位置) (y座標開始位置) l[ (x座標軌跡) (y座標軌跡)]...'
		 * 	sty:e style指定オブジェクト
		 * }
		 * // 例：(100px,200px)の位置から(x,y)方向に(10px,20px)移動し、その後その場所から(-10px,-10px)移動するようなデータの場合
		 * {
		 * 	d: 'M 100 200 l 10 20 -10 -10'
		 * 	sty:e {stroke:'rgb(255,0,0)', strokeWidth:'5px'}
		 * }
		 * </pre>
		 *
		 * @returns {DRPath}
		 */
		drawPath: function(data) {
			var attr = {
				d: data.pathData
			};
			var style = data.style;
			var elem = createSvgDrawingElement('path', {
				attr: attr,
				style: style
			});

			// Shapeの作成
			var shape = new DRPath(elem, this.artboardCommandManager);
			// 図形の登録と追加
			this.append(shape);
			return shape;
		},

		/**
		 * 長方形描画
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {Integer} x 左上のx座標
		 * @param {Integer} y 左上のy座標
		 * @param {Integer} width 正方形の幅
		 * @param {Integer} height 正方形の高さ
		 * @param {Object} style スタイル指定オブジェクト
		 * @returns {DRRect}
		 */
		drawRect: function(x, y, width, height, style) {
			var attr = {
				x: x,
				y: y,
				width: width,
				height: height
			};
			var elem = createSvgDrawingElement('rect', {
				attr: attr,
				style: style
			});

			// Shapeの作成
			var shape = new DRRect(elem, this.artboardCommandManager);
			// 図形の登録と追加
			this.append(shape);
			return shape;
		},

		/**
		 * 正方形描画
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {Integer} x 左上のx座標
		 * @param {Integer} y 左上のy座標
		 * @param {Integer} width 正方形の幅(=正方形の高さ)
		 * @param {Object} style スタイル指定オブジェクト
		 * @returns {DRRect}
		 */
		drawSquare: function(x, y, width, style) {
			// 幅と高さが同じである長方形(Rect)として描画する
			return this.drawRect(x, y, width, width, style);
		},

		/**
		 * 楕円描画
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {Integer} cx 楕円の中心位置のx座標
		 * @param {Integer} cy 楕円の中心位置のy座標
		 * @param {Integer} rx 楕円の水平方向の半径
		 * @param {Integer} ry 楕円の垂直方向の半径
		 * @param {Object} style スタイル指定オブジェクト
		 * @returns {DREllipse}
		 */
		drawEllipse: function(cx, cy, rx, ry, style) {
			var attr = {
				cx: cx,
				cy: cy,
				rx: rx,
				ry: ry
			};
			var elem = createSvgDrawingElement('ellipse', {
				attr: attr,
				style: style
			});
			// Shapeの作成
			var shape = new DREllipse(elem, this.artboardCommandManager);
			// 図形の登録と追加
			this.append(shape);
			return shape;
		},

		/**
		 * 真円描画
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {Integer} cx 円の中心位置のx座標
		 * @param {Integer} cy 円の中心位置のy座標
		 * @param {Integer} r 円の半径
		 * @param {Object} style スタイル指定オブジェクト
		 * @returns {DREllipse}
		 */
		drawCircle: function(cx, cy, r, style) {
			// rx,ryが同じである楕円(Ellipse)として描画する
			return this.drawEllipse(cx, cy, r, r, style);
		},

		/**
		 * 画像の配置
		 * <p>
		 * 画像をdivレイヤに配置します
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {Object} data
		 *
		 * <pre>
		 * {
		 * 	x: x座標,
		 * 	y: y座標,
		 * 	width: 幅,
		 * 	height: 高さ,
		 * 	id: 画像ID。idが指定された場合、imageSrcMapから描画する画像パスを探します
		 * 	// src: 画像パス。IDが指定されている場合はsrcの指定は無効です。
		 * }
		 * </pre>
		 *
		 * @returns {DRImage}
		 */
		drawImage: function(data) {
			var attr = {
				x: data.x,
				y: data.y,
				height: data.height,
				width: data.width
			};
			var src = data.id ? this.imageSourceMap[data.id] : data.src;

			var attrNS = [{
				ns: XLINKNS,
				name: 'href',
				value: src
			}];

			var style = data.style;
			var elem = createSvgDrawingElement('image', {
				attr: attr,
				attrNS: attrNS,
				style: style
			});
			$(elem).data(DATA_IMAGE_SOURCE_ID, data.id);

			// Shapeの作成
			var shape = new DRImage(elem, this.artboardCommandManager);
			// 図形の追加
			this.append(shape);
			return shape;
		},

		/**
		 * テキストの配置
		 * <p>
		 * svgレイヤに配置します
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {Object} data
		 *
		 * <pre>
		 * {
		 *  x: 左上のx座標,
		 *  y: 左上のy座標
		 *  text: 入力文字列,
		 * 	font: フォント,
		 * 	fontSize: フォントサイズ,
		 * 	fill: 色,
		 * 	fillOpacity: 透明度
		 * }
		 * </pre>
		 *
		 * @returns {DRImage}
		 */
		drawText: function(data) {
			var attr = {
				x: data.x,
				y: data.y,
				fill: data.fill,
				opacity: data.opacity,
				'font-family': data.fontFamily,
				'font-size': data.fontSize
			};
			var elem = createSvgDrawingElement('text', {
				attr: attr
			});
			$(elem).text(data.text);

			if (data.style) {
				$(elem).css(data.style);
			}

			// Shapeの作成
			var shape = new DRText(elem, this.artboardCommandManager);
			// 図形の追加
			this.append(shape);
			return shape;
		},

		/**
		 * ロジック管理下にある図形(Shape)を全て取得
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {Boolean} exceptAlone trueの場合描画されている図形のみ
		 * @returns {DRShape[]}
		 */
		getAllShapes: function(exceptAlone) {
			var shapes = [];
			var shapeMap = this._shapeMap;
			for ( var id in shapeMap) {
				var shape = shapeMap[id];
				if (exceptAlone && shape.isAlone()) {
					continue;
				}
				shapes.push(shape);
			}
			return shapes;
		},

		/**
		 * 渡された図形のIDを返す。(ロジック管理下にある図形のみ)
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {DRShape} shape
		 * @returns {String}
		 */
		getShapeID: function(shape) {
			var shapeMap = this._shapeMap;
			for ( var id in shapeMap) {
				if (shapeMap[id] === shape) {
					return id;
				}
			}
			return null;
		},

		/**
		 * 図形(Shape)をこのロジックの管理下に置く
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @instance
		 * @param {DRShape} shape
		 */
		_registShape: function(shape) {
			// Mapに登録
			var id = this._shapeIdSequence.next();
			$(shape.getElement()).data(DATA_SHAPE_ID, id);
			this._shapeMap[id] = shape;
		},

		//--------------------------------------------------------------
		// 背景画像
		//--------------------------------------------------------------
		/**
		 * 背景画像の設定
		 * <p>
		 * 画像IDまたはファイルパスと、画像の配置モードを指定したオブジェクトを渡してください
		 * </p>
		 * <p>
		 * 画像の配置モード(fillMode)は以下のいずれかを文字列で指定します
		 * </p>
		 * <ul>
		 * <li>none : 左上を原点として画像のサイズを変更せずに描画
		 * <li>contain : アスペクト比を保持して、全体が見えるように描画（描画領域と画像のアスペクト比が異なる場合は隙間ができます）
		 * <li>cover : アスペクト比を保持して、隙間が出ないように描画（描画領域と画像のアスペクト比が異なる場合は画像が描画領域をはみ出します）
		 * <li>stretch : アスペクト比を無視して、描画領域を埋めるように描画
		 * </ul>
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {Object} data
		 *
		 * <pre>
		 * {
		 * 	id: 画像ID。idが指定された場合、imageSrcMapから描画する画像パスを探します
		 * 	// src: 画像パス。IDが指定されている場合はsrcの指定は無効です。
		 * 	fillMode: 画像の配置モード('none'|'contain'|'cover'|'stretch') 指定のない場合は'none'で描画します,
		 * 	x: 背景画像の開始位置のx座標(fillModeがnoneの場合のみ有効。デフォルト:0),
		 * 	y: 背景画像の開始位置のy座標(fillModeがnoneの場合のみ有効。デフォルト:0)
		 * }
		 * </pre>
		 */
		setBackgroundImage: function(data) {
			var id = data.id;
			var src = id ? this.imageSourceMap[id] : data.src;
			var fillMode = data.fillMode || 'none';
			var x = data.x ? Math.round(parseFloat(data.x)) : 0;
			var y = data.y ? Math.round(parseFloat(data.y)) : 0;
			// 現在の設定と同じかどうかチェック
			// 現在の背景画像がid指定ならid、src指定されているならsrcで比較し、fillModeが同じかどうかもチェックする
			// fillModeが'none'ならx,yも同じかどうかチェックする
			var current = this._getCurrentBackgroundData();
			if (current && (current.id ? (current.id === id) : (current.src === src))
					&& current.fillMode === fillMode
					&& (fillMode !== 'none' || current.x === x && current.y === y)) {
				// 同じなら何もしない
				return;
			}

			var $layer = $(this._backgroundLayer);
			var $element;
			// fillModeにstretch指定が指定されていたらimg要素を作る
			if (fillMode === 'stretch') {
				$element = $('<img style="width:100%;height:100%">');
				$element.attr('src', src);
			} else {
				// stretch出なければbackgroundを指定したdivを作る
				$element = $('<div></div>');
				$element.css({
					backgroundImage: 'url("' + src + '")',
					backgroundSize: fillMode
				});
			}
			// fillModeとidと画像パスを要素に持たせておく
			$element.data('fillmode', fillMode);
			$element.data(DATA_IMAGE_SOURCE_ID, src);
			if (fillMode === 'none') {
				$element.css({
					left: x || 0,
					top: y || 0,
					position: 'absolute'
				});

				if (x < 0 || y < 0) {
					// xまたはyが負ならwidth/heightが100%だと表示しきれない場合があるので、heightとwidthを調整する
					var w = $layer.width();
					var h = $layer.height();
					$element.css({
						width: w - x,
						height: h - y
					});
				}
			}
			if (id) {
				$element.data(DATA_IMAGE_SOURCE_ID, id);
			}

			// コマンドの作成
			var layer = this._backgroundLayer;
			var afterElement = $element[0];
			var EVENT_EDIT_BACKGROUND = h5.ui.components.artboard.consts.EVENT_EDIT_BACKGROUND;
			var that = this;
			var command = new CustomCommand({
				execute: function() {
					var oldValue = that._getCurrentBackgroundData();
					this._preBgElement = $layer.children()[0];
					$(layer).append(afterElement);
					$(this._preBgElement).remove();
					var newValue = that._getCurrentBackgroundData();
					// 必要なデータだけ取得
					delete oldValue.color;
					delete newValue.color;
					return {
						type: EVENT_EDIT_BACKGROUND,
						layer: layer,
						oldValue: oldValue,
						newValue: newValue
					};
				},
				undo: function() {
					var oldValue = that._getCurrentBackgroundData();
					$(layer).append(this._preBgElement);
					$(afterElement).remove();
					var newValue = that._getCurrentBackgroundData();
					// 必要なデータだけ取得
					oldValue = {
						color: oldValue.color
					};
					newValue = {
						color: newValue.color
					};
					return {
						type: EVENT_EDIT_BACKGROUND,
						layer: layer,
						oldValue: oldValue,
						newValue: newValue
					};
				},
				_preBgElement: null
			});
			this.artboardCommandManager.appendCommand(command);
		},

		/**
		 * 背景色の設定
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {String} color 色
		 */
		setBackgroundColor: function(color) {
			// 現在の設定と同じかどうかチェック
			// 実際にダミー要素に背景色に設定してフォーマットされた色指定文字列と比較
			var formatColor = $('<div></div>').css('background-color', color).css(
					'background-color');
			if ($(this._backgroundLayer).css('background-color') === formatColor) {
				// 同じなら何もしない
				return;
			}
			var layer = this._backgroundLayer;
			var EVENT_EDIT_BACKGROUND = h5.ui.components.artboard.consts.EVENT_EDIT_BACKGROUND;
			var command = new CustomCommand({
				execute: function() {
					var $layer = $(layer);
					this._preColor = $layer.css('background-color');
					$layer.css('background-color', color);
					return {
						type: EVENT_EDIT_BACKGROUND,
						layer: layer,
						oldValue: this._preColor,
						newValue: color
					};
				},
				undo: function() {
					$(layer).css('background-color', this._preColor);
					return {
						type: EVENT_EDIT_BACKGROUND,
						layer: layer,
						oldValue: color,
						newValue: this._preColor
					};
				},
				_preColor: null
			});
			this.artboardCommandManager.appendCommand(command);
		},

		/**
		 * 背景画像をクリアします
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 */
		clearBackgroundImage: function() {
			var bgElement = this._backgroundLayer.children[0];
			if (!bgElement) {
				// 背景画像が無ければ何もしない
				return;
			}
			var command = new CustomCommand({
				execute: function() {
					$(this._preBgElement).remove();
				},
				undo: function() {
					$(this._layer).append(this._preBgElement);
				},
				_layer: this._backgroundLayer,
				_preBgElement: bgElement
			});
			this.artboardCommandManager.appendCommand(command);
		},

		/**
		 * 現在設定されている背景情報を取得します
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @instance
		 * @returns {Object}
		 *
		 * <pre>
		 * {
		 * 	id: id,
		 * 	src: src(idのない場合),
		 * 	fillMode: fillMode,
		 * 	color: 背景色
		 * }
		 * </pre>
		 */
		_getCurrentBackgroundData: function() {
			var $layer = $(this._backgroundLayer);
			var $bgElement = $layer.children().eq(0);
			var ret = {};
			// 背景色
			var color = $layer.css('background-color');
			if (!color && !$bgElement.length) {
				// 設定されていない場合はnullを返す
				return null;
			}
			ret.color = color;
			ret.fillMode = $bgElement.data('fillmode');
			var id = $bgElement.data(DATA_IMAGE_SOURCE_ID);
			if (id) {
				ret.id = id;
			} else {
				ret.src = $bgElement.data(DATA_IMAGE_SOURCE_ID);
			}
			if (ret.fillMode === 'none') {
				// noneならx,yも返す(四捨五入したint)
				ret.x = Math.round(parseFloat($bgElement.css('left')));
				ret.y = Math.round(parseFloat($bgElement.css('top')));
			}
			return ret;
		},

		//--------------------------------------------------------------
		// データ操作
		//--------------------------------------------------------------
		/**
		 * 描画されている図形からセーブデータを作成します
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @returns {DrawingSaveData}
		 */
		save: function() {
			// 描画されている図形要素を取得
			var shapes = this.getAllShapes(true);
			// 図形と背景のセーブデータを作って返す
			return new DrawingSaveData(shapes, this._getCurrentBackgroundData());
		},

		/**
		 * セーブデータををロードして描画します
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {DrawingSaveData}
		 */
		load: function(drawingSaveData) {
			var saveData = drawingSaveData.saveData;
			// クリア
			$(this._shapeLayer).children().remove();
			this._shapeMap = {};

			// 背景の復元
			var background = saveData.background;
			if (background) {
				if (background.color) {
					this.setBackgroundColor(background.color);
				}
				if (background.id) {
					this.setBackgroundImage({
						id: background.id,
						fillMode: background.fillMode,
						x: background.x,
						y: background.y
					});
				} else if (background.src) {
					this.setBackgroundImage({
						src: background.src,
						fillMode: background.fillMode,
						x: background.x,
						y: background.y
					});
				}
			}

			// Shapeの復元
			var shapesData = saveData.shapes;
			for (var i = 0, l = shapesData.length; i < l; i++) {
				// 図形の登録と追加
				this.append(DRShape.deserialize(shapesData[i], this.artboardCommandManager));
			}

			// image要素について、idから画像パスを復元する
			var $image = $(this._shapeLayer).find('image');
			var imageSourceMap = this.imageSourceMap;
			$image.each(function() {
				var $this = $(this);
				var id = $this.data(DATA_IMAGE_SOURCE_ID);
				if (id) {
					this.setAttributeNS(XLINKNS, 'href', imageSourceMap[id]);
				}
			});

			// コマンドマネージャのクリア
			this.artboardCommandManager.clearAll();
		},

		/**
		 * 描画されている図形を画像データにして返します
		 * <p>
		 * このメソッドはプロミスを返し、非同期で画像のデータURLを返します。画像が使用されている場合は非同期になる場合があります。
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @instance
		 * @param {String} [returnType="image/png"] imgage/png, image/jpeg, image/svg+xml のいずれか
		 * @param {Object} [processParameter.simulateItalic = false]
		 *            italicの指定されたDRTextオブジェクトの画像化の際に、指定されているフォントがitalic体を持たない場合に、変形して出力を行うかどうか
		 *            <p>
		 *            Firefox以外のブラウザでは、italic体を持たないフォントについてもブラウザが自動で変形を行うので、このフラグを指定しても結果は変わりません。
		 *            </p>
		 *            <p>
		 *            Firefoxの場合は、フォントファイルにitalick体が含まれていない場合、italicを指定してもブラウザによる自動変形は行われず、canvasに斜体を描画しません。
		 *            </p>
		 *            <p>
		 *            このフラグをtrueにすることで、italic体を持たないフォントについて、斜体をシミュレートするように変形を行います。
		 *            </p>
		 * @returns {Promise} doneハンドラに'data:'で始まる画像データURLを渡します
		 */
		getImage: function(returnType, processParameter) {
			returnType = returnType || 'image/png';
			var svg = this._shapeLayer;
			// canvasを作成
			var viewBox = svg.getAttribute('viewBox');
			var viewBoxValues = viewBox.split(' ');
			var canvasWidth = viewBoxValues[2];
			var canvasHeight = viewBoxValues[3];
			var canvas = document.createElement('canvas');
			canvas.setAttribute('width', canvasWidth);
			canvas.setAttribute('height', canvasHeight);
			var ctx = canvas.getContext('2d');

			var dfd = h5.async.deferred();

			// 背景を描画
			var background = this._getCurrentBackgroundData();
			var backgroundDfd = h5.async.deferred();
			if (background) {
				if (background.color) {
					ctx.fillStyle = background.color;
					ctx.fillRect(0, 0, canvas.width, canvas.height);
				}
				var src = background.id ? this.imageSourceMap[background.id] : background.src;
				if (src) {
					var fillMode = background.fillMode;
					var tmpImg = document.createElement('img');
					tmpImg.onload = function() {
						switch (fillMode) {
						case 'contain':
							var canvasRate = canvas.width / canvas.height;
							var imgRate = this.width / this.height;
							var w, h;
							if (canvasRate < imgRate) {
								w = canvas.width;
								h = w * imgRate;
							} else {
								h = canvas.height;
								w = h * imgRate;
							}
							ctx.drawImage(this, 0, 0, w, h);
							break;
						case 'cover':
							var canvasRate = canvas.width / canvas.height;
							var imgRate = this.width / this.height;
							var w, h;
							if (canvasRate < imgRate) {
								h = canvas.height;
								w = h / imgRate;
							} else {
								w = canvas.width;
								h = w / imgRate;
							}
							ctx.drawImage(this, 0, 0, w, h);
							break;
						case 'stretch':
							ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
							break;
						default:
							// none
							ctx.drawImage(this, background.x, background.y);
							break;
						}
						backgroundDfd.resolve();
					};
					tmpImg.src = src;
				} else {
					backgroundDfd.resolve();
				}
			} else {
				backgroundDfd.resolve();
			}

			// 背景描画が終わったら図形をカンバスに描画
			backgroundDfd.promise().then(
					this.own(function() {
						return this._canvasConvertLogic.drawSVGToCanvas(this._shapeLayer, canvas,
								processParameter);
					})).then(this.own(function() {
				// カンバスを画像化
				dfd.resolve(this._canvasConvertLogic.toDataURL(canvas, returnType, 1));
			}));
			return dfd.promise();
		}
	};

	//------------------------------------------------------------
	// expose
	//------------------------------------------------------------
	h5.core.expose(drawingLogic);
})();