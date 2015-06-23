//-------------------------------------------------
// コマンドマネージャ及びコマンド定義
//-------------------------------------------------
(function($) {
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
	 * ArtShape取り扱うコマンド
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
	 * @name ArtShapeCommand
	 * @class ArtShapeCommand
	 * @abstruct
	 * @extends Command
	 * @param {Object} commandData コマンドデータオブジェクト。以下のプロパティは必須です。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: ArtShapeオブジェクト
	 * }
	 * </code></pre>
	 */
	function ArtShapeCommand(commandData) {
	// 抽象クラスのため何もしない
	}
	$.extend(ArtShapeCommand.prototype, Command.prototype, {
		/**
		 * コマンドと紐づくArtShapeオブジェクトを取得する
		 *
		 * @memberOf ArtShapeCommand
		 * @instance
		 * @returns {ArtShape}
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
	 * @extends ArtShapeCommand
	 * @param {Object} commandData コマンドデータオブジェクト。AppendCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: 追加するArtShape
	 * 	layer: ArtShapeの要素を追加する対象の要素
	 * }
	 * </code></pre>
	 */
	function AppendCommand(commandData) {
		this._init(commandData);
	}
	$.extend(AppendCommand.prototype, ArtShapeCommand.prototype, {
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
	 * @extends ArtShapeCommand
	 * @param {Object} commandData コマンドデータオブジェクト。RemoveCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: 削除するArtShape
	 * }
	 * </code></pre>
	 */
	function RemoveCommand(commandData) {
		this._init(commandData);
		this._undoData = {};
	}
	$.extend(RemoveCommand.prototype, ArtShapeCommand.prototype, {
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
	 * @extends ArtShapeCommand
	 * @param {Object} commandData コマンドデータオブジェクト。StyleCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: スタイルを適用するArtShape
	 * 	style: 適用するスタイルオブジェクト
	 * }
	 * </code></pre>
	 */
	function StyleCommand(commandData) {
		this._init(commandData);
		this._undoData = {};
	}
	$.extend(StyleCommand.prototype, ArtShapeCommand.prototype, {
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
	 * @extends ArtShapeCommand
	 * @param {Object} commandData コマンドデータオブジェクト。AttrCommandクラスでは以下のようなプロパティを持つオブジェクトを指定してください。
	 *
	 * <pre class="sh_javascript"><code>
	 * {
	 * 	shape: スタイルを適用するArtShape
	 * 	attr: 適用する属性値オブジェクト(属性名をキーにして属性値を値に持つオブジェクト),
	 * 	attrNS: 適用する名前空間付属性(ns,name,valueをキーにそれぞれの値を持つオブジェクト)の配列
	 * }
	 * </code></pre>
	 */
	function AttrCommand(commandData) {
		this._init(commandData);
		this._undoData = {};
	}
	$.extend(AttrCommand.prototype, ArtShapeCommand.prototype, {
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
})(jQuery);