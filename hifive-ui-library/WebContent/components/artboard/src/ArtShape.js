//-------------------------------------------------
// 共通関数
//-------------------------------------------------
(function() {
	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	/** 要素に、要素の位置とサイズを持たせるときのデータ属性名 */
	var DATA_BOUNDS_OBJECT = h5.ui.components.artboard.DATA_BOUNDS_OBJECT;
	var XMLNS = h5.ui.components.artboard.consts.XMLNS;

	//------------------------------------------------------------
	// Variables
	//------------------------------------------------------------
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

	h5.u.obj.expose('h5.ui.components.artboard', {
		useDataForGetBBox: useDataForGetBBox,
		setBoundsData: setBoundsData,
		getBounds: getBounds,
		createSvgDrawingElement: createSvgDrawingElement
	});
})();

//-------------------------------------------------
// ArtShape定義
//-------------------------------------------------
(function($) {
	//------------------------------------------------------------
	// Const
	//------------------------------------------------------------
	var DATA_ELEMENT_TYPE = 'elementType';


	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	var XLINKNS = h5.ui.components.artboard.consts.XLINKNS;
	var createSvgDrawingElement = h5.ui.components.artboard.createSvgDrawingElement;
	var getBounds = h5.ui.components.artboard.getBounds;
	var StyleCommand = h5.ui.components.artboard.StyleCommand;
	var AttrCommand = h5.ui.components.artboard.AttrCommand;
	var CustomCommand = h5.ui.components.artboard.CustomCommand;
	// エラーメッセージ
	var ERR_MSG_ArtAGSESSION_DISABLED = h5.ui.components.artboard.message.ERR_MSG_ArtAGSESSION_DISABLED;

	//------------------------------------------------------------
	// Functions
	//------------------------------------------------------------
	/**
	 * 図形インスタンスのtypeを書き込み不可/列挙不可で設定(コンストラクタで設定)
	 *
	 * @private
	 * @param {ArtShape} instance 図形インスタンス
	 * @param {string} type 図形のタイプ
	 */
	function setShapeInstanceType(instance, type) {
		Object.defineProperty(instance, 'type', {
			value: type,
			writable: false,
			enumerable: false,
			configurable: false
		});
	}
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

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * DragSession
	 * <p>
	 * 図形(Shapeクラス)のドラッグ操作を行うためのクラスです。コンストラクタで渡された図形についてのドラッグ操作を管理します。
	 * </p>
	 *
	 * @class
	 * @name DragSession
	 * @param {ArtShape} shape ドラッグ操作対象の図形
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
		 * @type ArtShape
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
		move: function(x, y) {
			if (this._disable) {
				throw new Error(ERR_MSG_ArtAGSESSION_DISABLED);
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
				throw new Error(ERR_MSG_ArtAGSESSION_DISABLED);
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
				throw new Error(ERR_MSG_ArtAGSESSION_DISABLED);
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
		 * @param {number} x
		 * @param {number} y
		 */
		_translate: function(x, y) {
			if (this._disable) {
				throw new Error(ERR_MSG_ArtAGSESSION_DISABLED);
			}
			var transformValue = h5.u.str.format('translate({0},{1})', x, y);
			$(this.shape.getElement()).attr('transform', transformValue);
		}
	});

	//----------------------------
	// 図形クラス
	//----------------------------
	/**
	 * 図形クラス(抽象クラス)
	 * <p>
	 * {@link ArtRect}や{@link ArtPath}など、各図形クラスがこのクラスを継承しています。
	 * </p>
	 *
	 * @class
	 * @name ArtShape
	 * @abstract
	 */
	function ArtShape() {
	// 抽象クラスのため何もしない
	}
	/**
	 * シリアライズされた図形からArtShapeクラス(の子クラス)を生成して返します
	 * <p>
	 * 各図形クラスはserializeメソッドを用意しており、シリアライズ可能なオブジェクトを生成することができます。
	 * </p>
	 * <p>
	 * 以下は、ArtRectクラスの要素をシリアライズして復元するサンプルコードです。
	 * </p>
	 *
	 * <pre class="sh_javascript"><code>
	 * // ArtRectクラスを生成
	 * var rect = new h5.ui.components.artboard.ArtShapeConstructor.ArtRect(element);
	 *
	 * // ArtRectクラスをシリアライズ(プレーンオブジェクトに変換)
	 * var obj = rect.serialize();
	 *
	 * // デシリアライズ(復元) 戻り値はArtRectクラス
	 * h5.ui.components.artboard.ArtShapeConstructor.ArtShape.deserialize(rect);
	 * </code></pre>
	 *
	 * @memberOf ArtShape
	 * @static
	 * @function
	 * @param {Object} shapeData あるArtShapeについてのセーブデータ。{@link DrawingSaveData#saveData}.shapes配列の要素がshapeDataに該当します。
	 * @param {Logic} [commandManagerWrapper] コマンド生成時にappendCommandを行うロジックやクラス
	 * @returns {ArtShape} 復元した図形クラス(ArtShapeを継承する具象クラス)
	 */
	ArtShape.deserialize = function(shapeData, commandManagerWrapper) {
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
			shape = new ArtPath(element, commandManagerWrapper);
			break;
		case 'rect':
			shape = new ArtRect(element, commandManagerWrapper);
			break;
		case 'ellipse':
			shape = new ArtEllipse(element, commandManagerWrapper);
			break;
		case 'image':
			shape = new ArtImage(element, commandManagerWrapper);
			break;
		case 'text':
			shape = new ArtText(element, commandManagerWrapper);
			break;
		}
		return shape;
	};

	$.extend(ArtShape.prototype, {
		/**
		 * 初期化処理
		 *
		 * @memberOf ArtShape
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
		 * <p>
		 * 図形を表現している要素を返します。
		 * </p>
		 *
		 * @memberOf ArtShape
		 * @instance
		 * @returns {DOM}
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
		 * @memberOf ArtShape
		 * @instance
		 * @returns {DragSession}
		 */
		beginDrag: function() {
			return new DragSession(this, this.commandManagerWrapper);
		},

		/**
		 * 図形の位置とサイズを取得
		 *
		 * @memberOf ArtShape
		 * @instance
		 * @returns {Object} x,y,width,heightを持つオブジェクト
		 */
		getBounds: function() {
			return getBounds(this.getElement());
		},

		/**
		 * レイヤ上に描画されていない図形ならisAloneはtrue、そうでないならfalseを返します
		 *
		 * @memberOf ArtShape
		 * @instance
		 * @returns {boolean}
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
		 * @memberOf ArtShape
		 * @instance
		 * @param {number} x x座標位置
		 * @param {number} y y座標位置
		 * @returns {boolean} 図形が指定された座標と重なるかどうか
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
		 * @memberOf ArtShape
		 * @instance
		 * @param {number} x 矩形の左上のx座標位置
		 * @param {number} y 矩形の左上のy座標位置
		 * @param {number} w 矩形の幅
		 * @param {number} h 矩形の高さ
		 * @returns {boolean} 図形が指定された矩形に含まれるかどうか
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
		 * @memberOf ArtShape
		 * @instance
		 * @function
		 * @param {number} x x座標位置
		 * @param {number} y y座標位置
		 * @interface
		 */
		moveTo: function() {
			// 子クラスでの実装が必須
			throw new Error('moveToを使用する場合、子クラスでの実装が必須です');
		},

		/**
		 * 図形の移動を相対座標指定で行います
		 *
		 * @memberOf ArtShape
		 * @instance
		 * @function
		 * @param {number} x x座標位置
		 * @param {number} y y座標位置
		 * @interface
		 */
		moveBy: function() {
			// 子クラスでの実装が必須
			throw new Error('moveToを使用する場合、子クラスでの実装が必須です');
		},

		/**
		 * 図形をシリアライズ可能なオブジェクトに変換します
		 * <p>
		 * このメソッドで生成したオブジェクトは{@link ArtShape.deserialize}で元の図形クラスに復元することができます
		 * </p>
		 *
		 * @memberOf ArtShape
		 * @instance
		 * @function
		 * @interface
		 * @returns {Object} 図形情報を格納したシリアライズ可能なプレーンオブジェクト
		 */
		serialize: function() {
			// 子クラスでの実装が必須
			throw new Error('serializeを使用する場合、子クラスでの実装が必須です');
		},

		/**
		 * 任意のユーザデータを持たせることができるプロパティ
		 * <p>
		 * 図形個別に何か値を持たせたい場合はこのプロパティに自由に値を持たせることができます。
		 * </p>
		 * <p>
		 * デフォルト値はnullです
		 * </p>
		 *
		 * @memberOf ArtShape
		 * @instance
		 * @type {Any}
		 */
		userData: null,

		/**
		 * エレメントのスタイルをコマンドを作って設定
		 *
		 * @memberOf ArtShape
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
			if (this.commandManagerWrapper) {
				this.commandManagerWrapper.appendCommand(command);
			}
			return command;
		},

		/**
		 * エレメントのスタイルを取得
		 *
		 * @memberOf ArtShape
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
		 * @memberOf ArtShape
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
			if (this.commandManagerWrapper) {
				this.commandManagerWrapper.appendCommand(command);
			}
			return command;
		}

	// JSDocのみ。定義は各インスタンスのdefinePropertyで行っています
	/**
	 * 図形のタイプ
	 * <p>
	 * 各図形クラスのタイプを表す文字列です。ArtRectなら'rect'、ArtPathなら'path'などの値を持ちます。
	 * </p>
	 * <p>
	 * 読み取り専用属性です。
	 * </p>
	 *
	 * @memberOf ArtShape
	 * @instance
	 * @name type
	 * @type {string}
	 */
	});

	/**
	 * ストロークを持つ図形クラスのプロトタイプに、setter/getterを持つプロパティを追加
	 *
	 * @private
	 * @param {Object} proto
	 * @returns {Object} 渡されたオブジェクトにストロークを持つ図形のプロパティを追加して返す
	 */
	function mixinArtStrokeShape(proto) {
		// JSDocのみ
		/**
		 * ストロークを持つ図形についてのプロパティ定義
		 * <p>
		 * 以下のクラスがArtStrokeShapeのプロパティを持ちます(プロトタイプにmixinしています)
		 * </p>
		 * <ul>
		 * <li>{@link ArtPath}
		 * <li>{@link ArtRect}
		 * <li>{@link ArtEllipse}
		 * </ul>
		 *
		 * @mixin
		 * @name ArtStrokeShape
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
			 * @memberOf ArtStrokeShape
			 * @instance
			 * @type {string}
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
			 * @memberOf ArtStrokeShape
			 * @instance
			 * @type {number}
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
			 * @memberOf ArtStrokeShape
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
	function mixinArtFillShape(proto) {
		/**
		 * 塗りつぶしを持つ図形についてのプロパティ定義
		 * <p>
		 * 以下のクラスがArtFillShapeのプロパティを持ちます(プロトタイプにmixinしています)
		 * </p>
		 * <ul>
		 * <li>{@link ArtRect}
		 * <li>{@link ArtEllipse}
		 * </ul>
		 *
		 * @mixin
		 * @name ArtFillShape
		 */
		var props = {
			/**
			 * 図形の塗りつぶしの色
			 * <p>
			 * このプロパティにはsetterが設定されており、値を変更すると図形に反映されます。
			 * </p>
			 * <p>
			 * CSSカラー形式の文字列を指定します(#f00,rgb(255,0,0) など)
			 * </p>
			 *
			 * @name fillColor
			 * @memberOf ArtFillShape
			 * @instance
			 * @type {string}
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
			 * 図形の塗りつぶしの透明度(0～1)
			 * <p>
			 * このプロパティにはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name fillOpacity
			 * @memberOf ArtFillShape
			 * @instance
			 * @type {number}
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
	function mixinArtTextShape(proto) {
		/**
		 * テキストを持つ図形についてのプロパティ定義
		 * <p>
		 * 以下のクラスがArtTextShapeのプロパティを持ちます(プロトタイプにmixinしています)
		 * </p>
		 * <ul>
		 * <li>{@link ArtText}
		 * </ul>
		 *
		 * @mixin
		 * @name ArtTextShape
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
			 * @memberOf ArtTextShape
			 * @instance
			 * @type {string}
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
			 * @memberOf ArtTextShape
			 * @instance
			 * @type {number}
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
			 * 図形が表示する文字列を設定します。
			 * </p>
			 * <p>
			 * このプロパティはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name textContent
			 * @memberOf ArtTextShape
			 * @instance
			 * @type {string}
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
			 * 図形が表示する文字のフォントを設定します。
			 * </p>
			 * <p>
			 * このプロパティはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name fontFamily
			 * @memberOf ArtTextShape
			 * @instance
			 * @type {string}
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
			 * 図形が表示する文字のフォントサイズを設定します。
			 * </p>
			 * <p>
			 * このプロパティはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name fontSize
			 * @memberOf ArtTextShape
			 * @instance
			 * @type {number}
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
			 * 図形が表示する文字についてのスタイルオブジェクトで、 'text-decoration', 'font-weight', 'font-style'をプロパティに持ちます。
			 * </p>
			 * <p>
			 * このプロパティはsetterが設定されており、値を変更すると図形に反映されます
			 * </p>
			 *
			 * @name fontStyle
			 * @memberOf ArtTextShape
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
	 * <p>
	 * 線(path)を表現する図形クラス
	 * </p>
	 *
	 * @class
	 * @name ArtPath
	 * @extends ArtShape
	 * @mixes ArtStrokeShape
	 * @param element {DOM} パス要素(path)
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function ArtPath(element, commandManagerWrapper) {
		// typeの設定
		setShapeInstanceType(this, 'path');
		this._init(element, commandManagerWrapper);
	}
	ArtPath.prototype = Object.create(ArtShape.prototype);
	ArtPath.constructor = ArtPath;
	$.extend(mixinArtStrokeShape(ArtPath.prototype), {
		/**
		 * @memberOf ArtPath
		 * @inheritdoc
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
		 * @memberOf ArtPath
		 * @inheritdoc
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
		 * @memberOf ArtPath
		 * @inheritdoc
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
		 * path要素のd属性の先頭座標(Mで始まる座標指定)を取得する正規表現
		 *
		 * @memberOf ArtPath
		 * @private
		 * @type {RegExp}
		 */
		_pathMRegexp: /^M -?\d+(\.\d+)? -?\d+(\.\d+)?/
	});

	/**
	 * 矩形(rect)クラス
	 * <p>
	 * 矩形を表す図形クラス
	 * </p>
	 *
	 * @class
	 * @name ArtRect
	 * @extends ArtShape
	 * @mixes ArtStrokeShape
	 * @mixes ArtFillShape
	 * @param {DOM} element 矩形要素(rect)
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function ArtRect(element, commandManagerWrapper) {
		// typeの設定
		setShapeInstanceType(this, 'rect');
		this._init(element, commandManagerWrapper);
	}
	ArtRect.prototype = Object.create(ArtShape.prototype);
	ArtRect.constructor = ArtRect;
	$.extend(mixinArtFillShape(mixinArtStrokeShape(ArtRect.prototype)), {
		/**
		 * @memberOf ArtRect
		 * @inheritdoc
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
		 * @memberOf ArtRect
		 * @inheritdoc
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
		 * @memberOf ArtRect
		 * @inheritdoc
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
	 * <p>
	 * 楕円を表現する図形クラス
	 * </p>
	 *
	 * @class
	 * @name ArtEllipse
	 * @extends ArtShape
	 * @mixes ArtStrokeShape
	 * @mixes ArtFillShape
	 * @param element 楕円要素(ellipse)
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function ArtEllipse(element, commandManagerWrapper) {
		// typeの設定
		setShapeInstanceType(this, 'ellipse');
		this._init(element, commandManagerWrapper);
	}
	ArtEllipse.prototype = Object.create(ArtShape.prototype);
	ArtEllipse.constructor = ArtEllipse;
	$.extend(mixinArtFillShape(mixinArtStrokeShape(ArtEllipse.prototype)), {
		/**
		 * @memberOf ArtEllipse
		 * @inheritdoc
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
		 * @memberOf ArtEllipse
		 * @inheritdoc
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
		 * @memberOf ArtEllipse
		 * @inheritdoc
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
	 * <p>
	 * 任意の画像を表現する図形クラス
	 * </p>
	 *
	 * @class
	 * @name ArtImage
	 * @extends ArtShape
	 * @param element 画像要素(image)
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function ArtImage(element, commandManagerWrapper) {
		// typeの設定
		setShapeInstanceType(this, 'image');
		this._init(element, commandManagerWrapper);
	}
	ArtImage.prototype = Object.create(ArtShape.prototype);
	ArtImage.constructor = ArtImage;
	$.extend(ArtImage.prototype, {
		/**
		 * @memberOf ArtImage
		 * @inheritdoc
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
		 * @memberOf ArtImage
		 * @inheritdoc
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
		 * @memberOf ArtImage
		 * @inheritdoc
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
	 * <p>
	 * 文字列を表現する図形クラス
	 * </p>
	 *
	 * @class
	 * @name ArtText
	 * @extends ArtShape
	 * @param element text要素
	 * @param {Logic|Any} commandManagerWrapper コマンド生成時にappendCommandを行うロジックやクラス
	 */
	function ArtText(element, commandManagerWrapper) {
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
	ArtText.prototype = Object.create(ArtShape.prototype);
	ArtText.constructor = ArtText;
	$.extend(mixinArtTextShape(ArtText.prototype), {
		/**
		 * @memberOf ArtText
		 * @inheritdoc
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
		 * @memberOf ArtText
		 * @inheritdoc
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
		 * @memberOf ArtText
		 * @inheritdoc
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
		 * <p>
		 * 表示する文字列を設定します
		 * </p>
		 *
		 * @memberOf ArtText
		 * @private
		 * @instance
		 * @param {string} val
		 * @param {string} prop テキストの設定を行うShapeが持つプロパティの名前
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

	//------------------------------------------------------------
	// expose
	//------------------------------------------------------------
	h5.u.obj.expose('h5.ui.components.artboard.ArtShapeConstructor', {
		ArtShape: ArtShape,
		ArtPath: ArtPath,
		ArtRect: ArtRect,
		ArtEllipse: ArtEllipse,
		ArtText: ArtText,
		ArtImage: ArtImage
	});
})(jQuery);