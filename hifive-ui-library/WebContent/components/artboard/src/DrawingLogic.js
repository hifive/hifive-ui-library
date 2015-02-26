//--------------------------------------------------------
// 共通定数定義
//--------------------------------------------------------
(function() {
	/** undoができるようになった時に上がるイベント名 */
	var EVENT_ENABLE_UNDO = 'enable-undo';

	/** redoができるようになった時に上がるイベント名 */
	var EVENT_ENABLE_REDO = 'enable-redo';

	/** undoができなくなった時に上がるイベント名 */
	var EVENT_DISABLE_UNDO = 'disable-undo';

	/** redoが出来なくなったときに上がるイベント名 */
	var EVENT_DISABLE_REDO = 'disable-redo';

	/** 描画操作を開始した時に上がるイベント名 */
	var EVENT_DRAWSTART = 'drawstart';

	/** 描画操作を終了した時に上がるイベント名 */
	var EVENT_DRAWEND = 'drawend';

	/** 図形を選択した時に上がるイベント名 */
	var EVENT_SELECT_SHAPE = 'select-shape';

	/** 図形の選択を解除した時に上がるイベント名 */
	var EVENT_UNSELECT_SHAPE = 'unselect-shape';

	/** imageSourceMapと対応付けるために要素に持たせるデータ属性名 */
	var DATA_IMAGE_SOURCE_ID = 'h5-artboad-image-id';

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
			EVENT_ENABLE_UNDO: EVENT_ENABLE_UNDO,
			EVENT_ENABLE_REDO: EVENT_ENABLE_REDO,
			EVENT_DISABLE_UNDO: EVENT_DISABLE_UNDO,
			EVENT_DISABLE_REDO: EVENT_DISABLE_REDO,
			EVENT_DRAWSTART: EVENT_DRAWSTART,
			EVENT_DRAWEND: EVENT_DRAWEND,
			EVENT_SELECT_SHAPE: EVENT_SELECT_SHAPE,
			EVENT_UNSELECT_SHAPE: EVENT_UNSELECT_SHAPE,
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
	// 空コンストラクタ
	}
	$.extend(Command.prototype, {
		/**
		 * コマンドの実行
		 *
		 * @memberOf Command
		 * @returns {Command} 自分自身を返す
		 */
		execute: function() {
			if (this._isExecuted) {
				return this;
			}
			this._execute();
			this._isExecuted = true;
			return this;
		},

		/**
		 * コマンドの取り消し
		 *
		 * @memberOf Command
		 * @returns {Command} 自分自身を返す
		 */
		undo: function() {
			if (!this._isExecuted) {
				return this;
			}
			this._undo();
			this._isExecuted = false;
			return this;
		},

		/**
		 * コンストラクタで指定したコマンドデータオブジェクトを返します
		 *
		 * @memberOf Command
		 * @returns {Object} コマンドデータオブジェクト
		 */
		getCommandData: function() {
			return this._data;
		},

		/**
		 * コマンド同士をマージする
		 * <p>
		 * 戻り値としてマージ可能かどうかを返します。
		 * </p>
		 *
		 * @memberOf Command
		 * @param {Command} マージ対象のコマンド
		 * @returns {boolean} マージできたかどうか
		 */
		mergeCommand: function(after) {
			// マージ処理の実装はそれぞれの子クラスで実装します
			// マージをサポートしないCommandの子クラスは実装の必要ありません
			return false;
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
	 * @abstruct
	 */
	function CustomCommand(commandData) {
		this._data = commandData;
		this._execute = function() {
			commandData.execute.call(commandData);
		};
		this._undo = function() {
			commandData.undo.call(commandData);
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
	 * 要素の追加を行うコマンド
	 *
	 * @name AppendCommand
	 * @class
	 * @extend Command
	 * @param {Object} commandData コマンドデータオブジェクト。AppendCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript">
	 * {
	 * 	element: 追加する要素
	 * 	layer: 追加先の要素
	 * }
	 * </pre>
	 */
	function AppendCommand(commandData) {
		this._data = commandData;
	}
	$.extend(AppendCommand.prototype, Command.prototype, {
		/**
		 * @private
		 * @see Command#execute
		 */
		_execute: function() {
			this._data.layer.appendChild(this._data.element);
		},

		/**
		 * @private
		 * @see Command#undo
		 */
		_undo: function() {
			this._data.layer.removeChild(this._data.element);
		}
	});

	/**
	 * 要素の削除を行うコマンド
	 *
	 * @name RemoveCommand
	 * @class
	 * @extend Command
	 * @param {Object} commandData コマンドデータオブジェクト。RemoveCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript">
	 * {
	 * 	element: 削除する要素
	 * }
	 * </pre>
	 */
	function RemoveCommand(commandData) {
		this._data = commandData;
		this._undoData = {};
	}
	$.extend(RemoveCommand.prototype, Command.prototype, {
		/**
		 * @private
		 * @see Command#execute
		 */
		_execute: function() {
			var parent = this._data.element.parentNode;
			if (!parent) {
				throw new Error(ERR_MSG_CANNOT_REMOVE_NOT_APPENDED);
			}
			this._undoData.parent = parent;
			parent.removeChild(this._data.element);
		},

		/**
		 * @private
		 * @see Command#undo
		 */
		_undo: function() {
			this._undoData.parent.appendChild(this._data.element);
		}
	});

	/**
	 * スタイルの変更を行うコマンド
	 *
	 * @name StyleCommand
	 * @class
	 * @extend Command
	 * @param {Object} commandData コマンドデータオブジェクト。StyleCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript">
	 * {
	 * 	element: スタイルを適用する要素,
	 * 	style: 適用するスタイルオブジェクト
	 * }
	 * </pre>
	 */
	function StyleCommand(data) {
		this._data = data;
		this._undoData = {};
	}
	$.extend(StyleCommand.prototype, Command.prototype, {
		/**
		 * @private
		 * @see Command#execute
		 */
		_execute: function() {
			var before = {};
			var element = this._data.element;
			for ( var p in this._data.style) {
				// camelCaseにして、jQueryを使わずにスタイルを適用する
				// (jQueryを使った場合にopacityの値に'px'が足されてしまい、Firefoxだと値が反映されない)
				var camel = $.camelCase(p);
				before[camel] = element.style[camel];
				element.style[camel] = this._data.style[p];
			}
			this._undoData.beforeStyle = before;
		},

		/**
		 * @private
		 * @see Command#undo
		 */
		_undo: function() {
			$(this._data.element).css(this._undoData.beforeStyle);
		}
	//		,
	//		/**
	//		 * 同一要素のスタイル変更コマンドについてマージします
	//		 * <p>
	//		 * 同一要素が対象でない場合はマージできません。falseを返します。
	//		 * </p>
	//		 *
	//		 * @see Command#mergeCommand
	//		 */
	//		mergeCommand: function(after) {
	//			// スタイルの場合は一つのコマンドにする
	//			// 同一の要素に対するスタイル変更のコマンドのマージ
	//			if (after instanceof StyleCommand && this._undoData.beforeStyle
	//					&& after._undoData.beforeStyle
	//					&& this._data.element === after.getCommandData().element) {
	//				this._undoData.beforeStyle = $.extend({}, after._undoData.beforeStyle,
	//						this._undoData.beforeStyle);
	//				$.extend(this._data.style, after._data.style);
	//				return true;
	//			}
	//			return false;
	//		}
	});

	/**
	 * 属性値の変更を行うコマンド
	 *
	 * @name AttrCommand
	 * @class
	 * @extend Command
	 * @param {Object} commandData コマンドデータオブジェクト。AttrCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript">
	 * {
	 * 	element: 属性値を適用する要素,
	 * 	attr: 適用する属性値オブジェクト(属性名をキーにして属性値を値に持つオブジェクト),
	 * 	attrNS: 適用する名前空間付属性(ns,name,valueをキーにそれぞれの値を持つオブジェクト)の配列
	 * }
	 * </pre>
	 */
	function AttrCommand(data) {
		this._data = data;
		this._undoData = {};
	}
	$.extend(AttrCommand.prototype, Command.prototype, {
		/**
		 * @private
		 * @see Command#execute
		 */
		_execute: function() {
			var attr = this._data.attr;
			var attrNS = this._data.attrNS;
			var element = this._data.element;
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
		},

		/**
		 * @private
		 * @see Command#undo
		 */
		_undo: function() {
			var attr = this._beforeAttr.attr;
			var attrNS = this._beforeAttr.attrNS;
			var element = this._data.element;
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
			if (useDataForGetBBox && element.tagName.toLowerCase() === 'path') {
				setBoundsData(element, this._beforeBounds);
			}
		}
	});

	/**
	 * 複数のCommandを一つのコマンドとして扱うコマンド
	 *
	 * @name SequenceCommand
	 * @class
	 * @extends{Command}
	 * @param {Command[]} [commands=[]] Commandの配列
	 */
	function SequenceCommand(commands) {
		this._commands = commands || [];
	}
	$.extend(SequenceCommand.prototype, Command.prototype, {
		/**
		 * @private
		 * @see Command#execute
		 */
		_execute: function() {
			for (var i = 0, l = this._commands.length; i < l; i++) {
				this._commands[i].execute();
			}
		},

		/**
		 * @private
		 * @see Command#undo
		 */
		_undo: function() {
			for (var i = this._commands.length - 1; i >= 0; i--) {
				this._commands[i].undo();
			}
		},

		/**
		 * コマンドの追加
		 *
		 * @memberOf SequenceCommand
		 * @param {Command}
		 */
		push: function(command) {
			this._commands.push(command);
		},

		/**
		 * 内部コマンドの取得
		 *
		 * @memberOf SequenceCommand
		 * @returns {Commands[]}
		 */
		getInnerCommands: function() {
			return this._commands;
		},

		/**
		 * 引数にSequenceCommandが渡された場合にコマンドをマージします
		 *
		 * @memberOf SequenceCommand
		 * @see {@link Command.mergeCommand}
		 */
		mergeCommand: function(after) {
			if (after instanceof SequenceCommand) {
				Array.prototype.push.apply(this._commands, after._commands);
				return true;
			}
			if (after instanceof Command) {
				this.push(after);
				return true;
			}
			return false;
		}
	});

	/**
	 * コマンドマネージャ
	 *
	 * @name CommandManager
	 * @class
	 * @extends EventDispatcher
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
					type: 'disable-redo'
				});
			}
			// 最後尾に追加
			history.push(command);
			// indexを更新
			this._index++;
			if (index === 0) {
				// 0番目を見ていた時は、UNDO可能になったことを通知
				this.dispatchEvent({
					type: 'enable-undo'
				});
			}
		},

		/**
		 * 一つ戻す
		 *
		 * @memberOf CommandManager
		 */
		undo: function() {
			var history = this._history;
			var index = this._index;
			var command = history[index - 1];
			if (!command) {
				return;
			}
			// undo実行
			if ($.isArray(command)) {
				for (var i = command.length - 1; i >= 0; i--) {
					command[i].undo();
				}
			} else {
				command.undo();
			}
			this._index--;
			// 元々redoできなかった場合(最後を見ていた場合)はredo可能になったことを通知
			if (index === history.length) {
				this.dispatchEvent({
					type: 'enable-redo'
				});
			}
			// 1番目を見ていた時は、今回のundoでundo不可になったことを通知
			if (index === 1) {
				this.dispatchEvent({
					type: 'disable-undo'
				});
			}
		},

		/**
		 * 一つ進む
		 *
		 * @memberOf CommandManager
		 */
		redo: function() {
			var history = this._history;
			var index = this._index;
			var command = history[index];
			if (!command) {
				return;
			}
			// redo実行
			if ($.isArray(command)) {
				for (var i = command.length - 1; i >= 0; i--) {
					command[i].execute();
				}
			} else {
				command.execute();
			}
			this._index++;
			// 元々undeできなかった場合(0番目を見ていた場合はundo可能になったことを通知
			if (index === 0) {
				this.dispatchEvent({
					type: 'enable-undo'
				});
			}
			// 最後の一個前を見ていた時は、今回のredoでredo不可になったことを通知
			if (index === history.length - 1) {
				this.dispatchEvent({
					type: 'disable-redo'
				});
			}
		},

		/**
		 * 管理対象のコマンドを全て管理対象から外す
		 *
		 * @memberOf CommandManager
		 */
		clearAll: function() {
			var index = this._index;
			var historyLength = this._history.length;
			this._history.splice(0, 0);
			this._index = 0;
			// undo不可になったことを通知
			if (index !== 0) {
				this.dispatchEvent({
					type: 'disable-undo'
				});
			}
			// redo不可になったことを通知
			if (index < historyLength) {
				this.dispatchEvent({
					type: 'disable-redo'
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
		 * @param {SVG} svgElement svg要素
		 * @param {Canvas} canvas canvas要素
		 */
		drawSVGToCanvas: function(svgElement, canvas) {
			var ctx = canvas.getContext('2d');
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
					var x = element.getAttribute('x');
					var y = element.getAttribute('y');
					var fill = element.getAttribute('fill');
					var opacity = element.getAttribute('opacity');
					var fontFamily = element.getAttribute('font-family');
					var fontSize = element.getAttribute('font-size');
					var content = $(element).text();
					ctx.save();
					ctx.font = h5.u.str.format('{0}px {1}', fontSize, fontFamily);
					ctx.fillStyle = fill;
					ctx.globalAlpha = opacity;
					ctx.fillText(content, x, y);
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
		 * @param {String} returnType imgage/png, image/jpeg, image/svg+xml のいずれか
		 * @param {Object} processParameter 0.0～1.0の範囲で品質レベルを指定
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
	var Command = h5.ui.components.artboard.Command;
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
		 * 	type: ['path' | 'rect' | 'ellipse' | 'image'],
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
	 * @param {Object} shapeData
	 * @param {CommandTransactionLogic} artboadCommandManager
	 * @returns {DRShape}
	 */
	DRShape.deserialize = function(shapeData, artboadCommandManager) {
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
			shape = new DRPath(element, artboadCommandManager);
			break;
		case 'rect':
			shape = new DRRect(element, artboadCommandManager);
			break;
		case 'ellipse':
			shape = new DREllipse(element, artboadCommandManager);
			break;
		case 'image':
			shape = new DRImage(element, artboadCommandManager);
			break;
		case 'text':
			shape = new DRText(element, artboadCommandManager);
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
		 */
		_init: function(element, artboadCommandManager) {
			this.artboadCommandManager = artboadCommandManager;
			this._element = element;
			$(element).data(DATA_ELEMENT_TYPE, this.type);
		},

		/**
		 * 図形要素を取得
		 *
		 * @memberOf DRShape
		 */
		getElement: function() {
			return this._element;
		},

		/**
		 * ドラッグセッションの開始
		 *
		 * @memberOf DRShape
		 * @returns {DragSession}
		 */
		beginDrag: function() {
			return new DragSession(this, this.artboadCommandManager);
		},

		/**
		 * 図形の位置とサイズを取得
		 *
		 * @memberOf DRShape
		 * @returns {Object} x,y,width,heightを持つオブジェクト
		 */
		getBounds: function() {
			return getBounds(this.getElement());
		},

		/**
		 * レイヤ上に描画されていない図形ならisAloneはtrue、そうでないならfalseを返します
		 *
		 * @memberOf DRShape
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
		 * @param x
		 * @param y
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
		 * @param x
		 * @param y
		 * @param w
		 * @param h
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
		 * @function
		 * @param {Integer} x x座標位置
		 * @param {Integer} y y座標位置
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
		 * @function
		 * @param {Integer} x x座標位置
		 * @param {Integer} y y座標位置
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
		 * @function
		 * @interface
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
		 * @param style
		 * @returns {Command}
		 */
		_setStyle: function(style) {
			var element = this._element;
			var command = new StyleCommand({
				element: element,
				style: style
			});
			this.artboadCommandManager.appendCommand(command);
			return command;
		},

		/**
		 * エレメントのスタイルを取得
		 *
		 * @memberOf DRShape
		 * @private
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
		 * @param attr
		 * @param attrNS
		 * @returns {Command}
		 */
		_setAttr: function(attr, attrNS) {
			var command = new AttrCommand({
				element: this._element,
				attr: attr,
				attrNS: attrNS
			});
			this.artboadCommandManager.appendCommand(command);
			return command;
		}

	// JSDocのみ。定義は各インスタンスのdefinePropertyで行っています
	/**
	 * 図形のタイプ
	 *
	 * @memberOf DRShape
	 * @name type
	 * @type {String}
	 */
	});

	/**
	 * ストロークを持つ図形クラスのプロトタイプに、setter/getterを持つプロパティを追加
	 *
	 * @private
	 * @param {Object} strokeProto
	 * @returns {Object} 渡されたオブジェクトにストロークを持つ図形のプロパティを追加して返す
	 */
	function mixinDRStrokeShape(strokeProto) {
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

		Object.defineProperties(strokeProto, {
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
					});
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
					});
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
					});
				}
			}
		});
		return strokeProto;
	}

	/**
	 * 塗りつぶしを持つ図形クラスのプロトタイプに、setter/getterを持つプロパティを追加
	 *
	 * @private
	 * @param {Object} fillProto
	 * @returns {Object} 渡されたオブジェクトに塗りつぶし図形のプロパティを追加して返す
	 */
	function mixinDRFillShape(fillProto) {
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
		Object.defineProperties(fillProto, {
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
					});
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
					});
				}
			}
		});
		return fillProto;
	}

	/**
	 * テキスト持つ図形クラスのプロトタイプに、setter/getterを持つプロパティを追加
	 *
	 * @private
	 * @param {Object} textProto
	 * @returns {Object} 渡されたオブジェクトにテキスト図形のプロパティを追加して返す
	 */
	function mixinDRTextShape(textProto) {
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
		Object.defineProperties(textProto, {
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
			 * @type {String}
			 */
			textColor: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this.getElement().getAttribute('fill');
				},
				set: function(val) {
					this._setAttr({
						fill: val
					});
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
			 * @type {Number}
			 */
			textOpacity: {
				configurable: false,
				enumerable: true,
				get: function() {
					return this.getElement().getAttribute('opacity');
				},
				set: function(val) {
					this._setAttr({
						opacity: val
					});
				}
			}
		});
		return textProto;
	}

	/**
	 * パスクラス
	 *
	 * @class
	 * @name DRPath
	 * @extends DRShape
	 * @mixes DRStrokeShape
	 * @param element
	 * @param artboadCommandManager
	 */
	function DRPath(element, artboadCommandManager) {
		// typeの設定
		setShapeInstanceType(this, 'path');
		this._init(element, artboadCommandManager);
	}
	DRPath.prototype = Object.create(DRShape.prototype);
	DRPath.constructor = DRPath;
	$.extend(mixinDRStrokeShape(DRPath.prototype), {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DRPath
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
				element: element,
				attr: {
					d: d
				}
			}).execute();
			if (this.artboadCommandManager) {
				this.artboadCommandManager.appendCommand(command);
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DRPath
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
	 * @param element
	 * @param artboadCommandManager
	 */
	function DRRect(element, artboadCommandManager) {
		// typeの設定
		setShapeInstanceType(this, 'rect');
		this._init(element, artboadCommandManager);
	}
	DRRect.prototype = Object.create(DRShape.prototype);
	DRRect.constructor = DRRect;
	$.extend(mixinDRFillShape(mixinDRStrokeShape(DRRect.prototype)), {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DRRect
		 * @override
		 */
		moveTo: function(position) {
			var command = new AttrCommand({
				element: this.getElement(),
				attr: position
			}).execute();
			if (this.artboadCommandManager) {
				this.artboadCommandManager.appendCommand(command);
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DRRect
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
	 * @param element
	 * @param artboadCommandManager
	 */
	function DREllipse(element, artboadCommandManager) {
		// typeの設定
		setShapeInstanceType(this, 'ellipse');
		this._init(element, artboadCommandManager);
	}
	DREllipse.prototype = Object.create(DRShape.prototype);
	DREllipse.constructor = DREllipse;
	$.extend(mixinDRFillShape(mixinDRStrokeShape(DREllipse.prototype)), {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DREllipse
		 * @override
		 */
		moveTo: function(position) {
			var command = new AttrCommand({
				element: this.getElement(),
				attr: {
					cx: position.x,
					cy: position.y
				}
			}).execute();
			if (this.artboadCommandManager) {
				this.artboadCommandManager.appendCommand(command);
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DREllipse
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
	 * @param element
	 * @param artboadCommandManager
	 */
	function DRImage(element, artboadCommandManager) {
		// typeの設定
		setShapeInstanceType(this, 'image');
		this._init(element, artboadCommandManager);
	}
	DRImage.prototype = Object.create(DRShape.prototype);
	DRImage.constructor = DRImage;
	$.extend(DRImage.prototype, {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DRImage
		 * @override
		 */
		moveTo: function(position) {
			var command = new AttrCommand({
				element: this.getElement(),
				attr: {
					x: position.x,
					y: position.y
				}
			}).execute();
			if (this.artboadCommandManager) {
				this.artboadCommandManager.appendCommand(command);
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DRImage
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
	 * @param element
	 * @param artboadCommandManager
	 */
	function DRText(element, artboadCommandManager) {
		// typeの設定
		setShapeInstanceType(this, 'text');
		// data属性にtextの中身が設定されていればそれを適用する(deserialize時用)
		var $element = $(element);
		var text = $element.data('text-content');
		if (text) {
			$element.text(text);
		}
		this._init(element, artboadCommandManager);
	}
	DRText.prototype = Object.create(DRShape.prototype);
	DRText.constructor = DRText;
	$.extend(mixinDRTextShape(DRText.prototype), {
		/**
		 * {@link DRShape.moveTo}の実装
		 *
		 * @memberOf DRText
		 * @override
		 */
		moveTo: function(position) {
			var command = new AttrCommand({
				element: this.getElement(),
				attr: {
					x: position.x,
					y: position.y
				}
			}).execute();
			if (this.artboadCommandManager) {
				this.artboadCommandManager.appendCommand(command);
			}
			return command;
		},

		/**
		 * {@link DRShape.moveBy}の実装
		 *
		 * @memberOf DRText
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
		}
	});
	//---------------------- 図形クラスの定義ここまで ----------------------

	/**
	 * DragSession
	 * <p>
	 * 図形のドラッグ操作を行うためのクラスです
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
		 * @name shape
		 * @type Shape
		 */
		this.shape = shape;

		/**
		 * ドラッグして移動した移動量
		 *
		 * @memberOf DragSession
		 * @private
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
		 * ドラッグセッション開始位置からの移動量を引数で指定する
		 * </p>
		 *
		 * @memberOf DragSession
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
		 *
		 * @memberOf DragSession
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
		 *
		 * @memberOf DragSession
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
		 * @memberOf DragSession
		 * @private
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
		 * @type {Object}
		 */
		imageSourceMap: {},

		/**
		 * canvasの画像変換を行うロジック
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 */
		_canvasConvertLogic: h5.ui.components.artboard.logic.CanvasConvertLogic,

		/**
		 * 図形描画領域のレイヤー
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 */
		_shapeLayer: null,

		/**
		 * 背景画像レイヤー
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 */
		_backgroundLayer: null,

		/**
		 * コマンド管理ロジックインスタンス
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @type h5.ui.components.artboard.logic.CommandTransactionLogic
		 */
		artboadCommandManager: null,

		/**
		 * このロジックで作成した図形(Shape)と図形IDのマップ
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 */
		_shapeMap: {},

		/**
		 * このロジックで作成した図形(Shape)のID管理用シーケンス
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 */
		_shapeIdSequence: h5.core.data.createSequence(),

		/**
		 * 初期化処理
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
		 * @param {DOM} drawingElement 図形描画領域レイヤ要素
		 * @param {DOM} backgroundElement 背景領域レイヤ要素
		 * @param {ArtboadCommandLogic} [artboadCommandManager] アートボードコマンドマネージャ
		 */
		init: function(drawingElement, backgroundElement, artboadCommandManager) {
			// svg要素とcanvas要素を取得
			this._shapeLayer = drawingElement;
			this._backgroundLayer = backgroundElement;
			this.artboadCommandManager = artboadCommandManager;
		},

		/**
		 * 直前の操作を取り消します
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 */
		undo: function() {
			this.artboadCommandManager.undo();
		},

		/**
		 * 直前に取り消した操作を再実行します
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 */
		redo: function() {
			this.artboadCommandManager.redo();
		},

		//---------------------------------------------------------------
		// 描画オブジェクトの操作
		//---------------------------------------------------------------
		/**
		 * 図形を追加
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @param layer {DOM|jQuery} 追加先レイヤ
		 */
		append: function(shape) {
			// コマンドを作成して実行
			var element = shape.getElement();
			var command = new AppendCommand({
				layer: this._shapeLayer,
				element: element
			});
			this._registShape(shape);
			this.artboadCommandManager.appendCommand(command);
		},

		/**
		 * 図形を削除
		 *
		 * @memberOf ShapeLayer
		 * @param {DRShape} shape
		 */
		remove: function(shape) {
			var command = new RemoveCommand({
				layer: this._shapeLayer,
				element: shape.getElement()
			});
			this.artboadCommandManager.appendCommand(command);
		},

		//----------------------------
		// 各図形の描画メソッド
		//----------------------------
		/**
		 * パス(フリーハンド、直線、多角形)描画
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
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
			var shape = new DRPath(elem, this.artboadCommandManager);
			// 図形の登録と追加
			this.append(shape);
			return shape;
		},

		/**
		 * 長方形描画
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
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
			var shape = new DRRect(elem, this.artboadCommandManager);
			// 図形の登録と追加
			this.append(shape);
			return shape;
		},

		/**
		 * 正方形描画
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
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
			var shape = new DREllipse(elem, this.artboadCommandManager);
			// 図形の登録と追加
			this.append(shape);
			return shape;
		},

		/**
		 * 真円描画
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
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
		 * クローンしてdivレイヤに配置します
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
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
			var shape = new DRImage(elem, this.artboadCommandManager);
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
				'font-family': data.font,
				'font-size': data.fontSize
			};
			var elem = createSvgDrawingElement('text', {
				attr: attr
			});
			$(elem).text(data.text);

			// Shapeの作成
			var shape = new DRText(elem, this.artboadCommandManager);
			// 図形の追加
			this.append(shape);
			return shape;
		},

		/**
		 * ロジック管理下にある図形(Shape)を全て取得
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
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
			var command = new CustomCommand({
				execute: function() {
					$(this._layer).append(this._element);
					$(this._preBgElement).remove();
				},
				undo: function() {
					$(this._layer).append(this._preBgElement);
					$(this._element).remove();
				},
				_layer: $layer[0],
				_element: $element[0],
				_preBgElement: $layer.children()[0]
			});
			this.artboadCommandManager.appendCommand(command);
		},

		/**
		 * 背景色の設定
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
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
			var command = new CustomCommand({
				execute: function() {
					var $layer = $(this._layer);
					this._preColor = $layer.css('background-color');
					$layer.css('background-color', this._color);
				},
				undo: function() {
					var $layer = $(this._layer);
					$layer.css('background-color', this._preColor);
				},
				_layer: this._backgroundLayer,
				_color: color,
				_preColor: null
			});
			this.artboadCommandManager.appendCommand(command);
		},

		/**
		 * 背景画像をクリアします
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
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
			this.artboadCommandManager.appendCommand(command);
		},

		/**
		 * 現在設定されている背景情報を取得します
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @private
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
				this.append(DRShape.deserialize(shapesData[i], this.artboadCommandManager));
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
			this.artboadCommandManager.clearAll();
		},

		/**
		 * 描画されている図形を画像データにして返します
		 * <p>
		 * このメソッドはプロミスを返し、非同期で画像のデータURLを返します。画像が使用されている場合は非同期になる場合があります。
		 * </p>
		 *
		 * @memberOf h5.ui.components.artboard.logic.DrawingLogic
		 * @param {String} [returnType="image/png"] imgage/png, image/jpeg, image/svg+xml のいずれか
		 * @param {Object} [processParameter]
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
			backgroundDfd.promise().then(this.own(function() {
				return this._canvasConvertLogic.drawSVGToCanvas(this._shapeLayer, canvas);
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