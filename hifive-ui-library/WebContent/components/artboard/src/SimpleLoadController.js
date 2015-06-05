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
// h5.ui.components.artboard.controller.SimpleLoadController
//----------------------------------------------------------------------------
(function() {
	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	var ArtShape = h5.ui.components.artboard.ArtShapeConstructor.ArtShape;

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * Artboard部品で生成される保存データ(DrawingSaveData)を復元して表示するコントローラ
	 *
	 * @class
	 * @name h5.ui.components.artboard.controller.SimpleLoadController
	 */
	var controller = {
		/**
		 * @memberOf h5.ui.components.artboard.controller.SimpleLoadController
		 * @private
		 */
		__name: 'h5.ui.components.artboard.controller.SimpleLoadController',

		/**
		 * @memberOf h5.ui.components.artboard.controller.SimpleLoadController
		 * @private
		 */
		__init: function() {
			// 表示エリアの作成
			this._$view = $('<div style="position:relative">');
			this._$bg = $('<div style="position:absolute; top:0; left:0; width:100%; height: 100%; z-index:-1; overflow: hidden;">');
			this._$svg = $(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
			this._$svg.css({
				posotion: 'absolute',
				top: 0,
				left: 0
			});
			this._$view.append(this._$bg);
			this._$view.append(this._$svg);
			$(this.rootElement).append(this._$view);
		},

		/**
		 * 保存データから復元
		 *
		 * @param {DrawingSaveData|String} artboardSaveData 保存データオブジェクトまたは保存データオブジェクトをシリアライズした文字列
		 * @memberOf h5.ui.components.artboard.controller.SimpleLoadController
		 */
		load: function(artboardSaveData) {
			if (typeof artboardSaveData === 'string') {
				artboardSaveData = h5.u.obj.deserialize(artboardSaveData);
			}

			// サイズの設定
			var size = artboardSaveData.size;
			this._$view.css(size);
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
					var $bgImg;
					var bgImgStyle = {};
					// stretch指定が指定されていたらimg要素を作る
					if (fillMode === 'stretch') {
						$bgImg = $('<img style="width:100%;height:100%;position:absolute;">');
						$bgImg.attr('src', background.src);
					} else {
						// stretchでなければbackgroundを指定したdivを作る
						$bgImg = $('<div style="width:100%;height:100%;position:absolute; background-repeat: no-repeat;"></div>');
						$bgImg.css({
							backgroundImage: 'url("' + background.src + '")',
							backgroundSize: fillMode
						});
					}
					var x = background.x;
					var y = background.y;
					bgImgStyle.left = x;
					bgImgStyle.top = y;
					if (x < 0 || y < 0) {
						// xまたはyが負ならwidth/heightが100%だと表示しきれない場合があるので、heightとwidthを調整する
						var w = this._$bg.width();
						var h = this._$bg.height();
						bgImgStyle.width = w - x;
						bgImgStyle.height = h - y;
					}
					$bgImg.css(bgImgStyle);
					this._$bg.append($bgImg);
				}
			}

			// Shapeの復元
			this._$svg.empty();
			var shapes = saveData.shapes;
			for (var i = 0, l = shapes.length; i < l; i++) {
				// 図形の登録と追加
				var shape = ArtShape.deserialize(shapes[i]);
				this._$svg.append(shape.getElement());
			}
		}
	};

	//------------------------------------------------------------
	// expose
	//------------------------------------------------------------
	h5.core.expose(controller);
})();