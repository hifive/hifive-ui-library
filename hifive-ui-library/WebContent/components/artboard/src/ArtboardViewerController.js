/*
 * Copyright (C) 2014 NS Solutions Corporation
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

//----------------------------------------------------------------------------
// h5.ui.components.artboard.controller.ArtboardViewerController
//----------------------------------------------------------------------------
(function() {
	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	var ArtShape = h5.ui.components.artboard.ArtShapeConstructor.ArtShape;
	var XMLNS = h5.ui.components.artboard.consts.XMLNS;

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * Artboard部品で生成される保存データ(DrawingSaveData)を復元して表示するコントローラ
	 *
	 * @class
	 * @name h5.ui.components.artboard.controller.ArtboardViewerController
	 */
	var controller = {
		/**
		 * @memberOf h5.ui.components.artboard.controller.ArtboardViewerController
		 * @private
		 */
		__name: 'h5.ui.components.artboard.controller.ArtboardViewerController',

		/**
		 * @memberOf h5.ui.components.artboard.controller.ArtboardViewerController
		 * @private
		 */
		__init: function() {
			// 表示エリアの作成
			// TODO 共通のテンプレートを使用するようにする
			this._$view = $('<div class="h5-artboard-canvas-wrapper" style="position:relative">');
			this._$layerWrapper = $('<div class="h5-artboard-layers"></div>');
			this._$bg = $('<div class="background-layer"></div>');
			this._$svg = $(document.createElementNS(XMLNS, 'svg'));
			this._$svg.attr('class', 'svg-layer');
			this._g = document.createElementNS(XMLNS, 'g');
			this._g.setAttribute('id', 'h5-artboard-id-' + new Date().getTime() + '-'
					+ parseInt(Math.random() * 10000));
			this._$svg.append(this._g);
			this._$layerWrapper.append(this._$bg);
			this._$layerWrapper.append(this._$svg);
			this._$view.append(this._$layerWrapper);
			$(this.rootElement).append(this._$view);
		},

		/**
		 * 保存データから図形を復元して描画
		 * <p>
		 * [DrawingLogic#save]{@link h5.ui.components.artboard.logic.DrawingLogic#save}
		 * などで生成したDrawingSaveDataクラスから図形をロードして描画します
		 * </p>
		 *
		 * @param {DrawingSaveData|string} artboardSaveData 保存データオブジェクトまたは保存データオブジェクトをシリアライズした文字列
		 * @memberOf h5.ui.components.artboard.controller.ArtboardViewerController
		 */
		load: function(artboardSaveData, isStretch) {
			if (typeof artboardSaveData === 'string') {
				artboardSaveData = h5.u.obj.deserialize(artboardSaveData);
			}

			// サイズの設定
			var size = artboardSaveData.size;
			if (isStretch) {
				// isStretch指定されていたらルートの大きさに固定
				this._$view.css({
					width: '100%',
					height: '100%'
				});
				// svg要素を変形させて縦横比が変わった場合、中身g要素はそれに追従せず縦横比が変わらない
				// svgの縦横比に合わせてg要素も変形する
				var viewW = this._$view.innerWidth();
				var viewH = this._$view.innerHeight();
				var orgAspectRatio = size.width / size.height;
				var viewAspectRatio = viewW / viewH;
				var isLargerViewAspect = orgAspectRatio < viewAspectRatio;
				var scaleX = isLargerViewAspect ? viewAspectRatio / orgAspectRatio : 1;
				var scaleY = isLargerViewAspect ? 1 : orgAspectRatio / viewAspectRatio;
				var transX = isLargerViewAspect ? size.height / viewH
						* (-viewW + viewH * orgAspectRatio) / 2 : 0;
				var transY = isLargerViewAspect ? 0 : size.width / viewW
						* (-viewH + viewW / orgAspectRatio) / 2;
				var transformValue = h5.u.str.format('matrix({0} 0 0 {1} {2} {3})', scaleX, scaleY,
						transX, transY);
				this._g.setAttribute('transform', transformValue);
			} else {
				// isStretch指定の無い場合はロードするデータのサイズに合わせる
				this._$view.css(size);
			}
			this._$svg[0].setAttribute('viewBox', h5.u.str.format('0 0 {0} {1}', size.width,
					size.height));

			var saveData = artboardSaveData.saveData;
			// 背景の復元
			var background = saveData.background;
			if (background) {
				if (background.color) {
					this._$bg.css('background-color', background.color);
				} else {
					this._$bg.css('background-color', 'transparent');
				}
				// 背景画像要素の生成
				this._$bg.empty();

				if (background.src) {
					var fillMode = background.fillMode;
					var layerW = this._$bg.width();
					var layerH = this._$bg.height();
					var $imgElement = $('<img>');
					var imgElement = $imgElement[0];
					$imgElement.attr('src', background.src);
					this._$bg.append(imgElement);
					var imgOnload = this.own(function() {
						var imgStyle = {
							left: background.offsetX || 0,
							top: background.offsetY || 0
						};
						var scaleX = scaleY = 1;
						if (isStretch) {
							scaleX = layerW / size.width;
							scaleY = layerH / size.height;
							imgStyle.left *= scaleX;
							imgStyle.top *= scaleY;
						}
						switch (fillMode) {
						case 'contain':
						case 'containCenter':
							// アスペクト比を維持して画像がすべて含まれるように表示
							var aspectRatio = size.width / size.height;
							var imgRate = imgElement.naturalWidth / imgElement.naturalHeight;
							if (aspectRatio < imgRate) {
								imgStyle.width = layerW;
								imgStyle.height = size.width / imgRate * scaleY;
							} else {
								imgStyle.height = layerH;
								imgStyle.width = size.height * imgRate * scaleX;
							}
							if (fillMode === 'containCenter') {
								// 中央配置
								if (aspectRatio < imgRate) {
									imgStyle.top += (layerH - imgStyle.height) / 2;
								} else {
									imgStyle.left += (layerW - imgStyle.width) / 2;
								}
							}
							break;
						case 'cover':
							// アスペクト比を維持して領域が画像で埋まるように表示
							var aspectRatio = size.width / size.height;
							var imgRate = imgElement.naturalWidth / imgElement.naturalHeight;
							if (aspectRatio < imgRate) {
								imgStyle.height = layerH;
								imgStyle.width = layerH / scaleY * imgRate * scaleX;
							} else {
								imgStyle.width = layerW;
								imgStyle.height = layerW / scaleX / imgRate * scaleY;
							}
							break;
						case 'stretch':
							// stretchの時はisStretch指定であっても描画先のサイズがいくつであっても100%指定でOK
							imgStyle.width = '100%';
							imgStyle.height = '100%';
							break;
						default:
							// 指定無しまたはnoneの場合はwidth/heightは計算しないで画像の幅、高さそのままで表示されるようにする
							if (isStretch) {
								// isStretch(表示先のサイズに合わせる)指定の場合は画面サイズに合うようにする
								imgStyle.width = imgElement.naturalWidth * scaleX;
								imgStyle.height = imgElement.naturalHeight * scaleY;
							}
						}
						$imgElement.css(imgStyle);
					});
					// img要素のロードが終わってから背景適用を実行
					if (imgElement.complete) {
						imgOnload();
					} else {
						imgElement.onload = imgOnload;
					}
				}
			}

			// Shapeの復元
			var $g = $(this._g);
			$g.empty();
			var shapes = saveData.shapes;
			for (var i = 0, l = shapes.length; i < l; i++) {
				// 図形の登録と追加
				var shape = ArtShape.deserialize(shapes[i]);
				$g.append(shape.getElement());
			}
		}
	};

	//------------------------------------------------------------
	// expose
	//------------------------------------------------------------
	h5.core.expose(controller);
})();