(function() {
	//------------------------------------------------------------
	// Const
	//------------------------------------------------------------
	/**
	 * italic体で描画した時に斜体になるかどうかの判定結果マップ
	 */
	var italicDrawableMap = {};

	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	/**
	 * SVGの名前空間
	 */
	var XLINKNS = h5.ui.components.artboard.consts.XLINKNS;

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

	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	var XLINKNS = h5.ui.components.artboard.consts.XLINKNS;
	var createSvgDrawingElement = h5.ui.components.artboard.createSvgDrawingElement;
	var CustomCommand = h5.ui.components.artboard.CustomCommand;
	var AppendCommand = h5.ui.components.artboard.AppendCommand;
	var RemoveCommand = h5.ui.components.artboard.RemoveCommand;
	var DATA_IMAGE_SOURCE_ID = h5.ui.components.artboard.consts.DATA_IMAGE_SOURCE_ID;

	// ArtShape実装クラスコンストラクタ
	var constructor = h5.ui.components.artboard.ArtShapeConstructor;
	var ArtShape = constructor.ArtShape;
	var ArtPath = constructor.ArtPath;
	var ArtRect = constructor.ArtRect;
	var ArtEllipse = constructor.ArtEllipse;
	var ArtText = constructor.ArtText;
	var ArtImage = constructor.ArtImage;

	//------------------------------------------------------------
	// Functions
	//------------------------------------------------------------

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * セーブデータ
	 *
	 * @class
	 * @name DrawingSaveData
	 * @param {ArtShape[]} shapes 保存するShapeの配列
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
		 * @param {ArtShape} shape
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
		 * @returns {ArtPath}
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
			var shape = new ArtPath(elem, this.artboardCommandManager);
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
		 * @returns {ArtRect}
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
			var shape = new ArtRect(elem, this.artboardCommandManager);
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
		 * @returns {ArtRect}
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
		 * @returns {ArtEllipse}
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
			var shape = new ArtEllipse(elem, this.artboardCommandManager);
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
		 * @returns {ArtEllipse}
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
		 * @returns {ArtImage}
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
			var shape = new ArtImage(elem, this.artboardCommandManager);
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
		 * @returns {ArtImage}
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
			var shape = new ArtText(elem, this.artboardCommandManager);
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
		 * @returns {ArtShape[]}
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
		 * @param {ArtShape} shape
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
		 * @param {ArtShape} shape
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
			// x,yも同じかどうかチェックする
			var current = this._getCurrentBackgroundData();
			if (current && (current.id ? (current.id === id) : (current.src === src))
					&& current.fillMode === fillMode && current.x === x && current.y === y) {
				// 設定が全て現在の設定と同じなら何もしない
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
			// x,yも返す(四捨五入したint)
			ret.x = Math.round(parseFloat($bgElement.css('left'))) || 0;
			ret.y = Math.round(parseFloat($bgElement.css('top'))) || 0;
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
				this.append(ArtShape.deserialize(shapesData[i], this.artboardCommandManager));
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
		 *            italicの指定されたArtTextオブジェクトの画像化の際に、指定されているフォントがitalic体を持たない場合に、変形して出力を行うかどうか
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
						var x = background.x;
						var y = background.y;
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
							ctx.drawImage(this, x, y, w, h);
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
							ctx.drawImage(this, x, y, w, h);
							break;
						case 'stretch':
							ctx.drawImage(this, x, y, canvas.width, canvas.height);
							break;
						default:
							// none
							ctx.drawImage(this, x, y);
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