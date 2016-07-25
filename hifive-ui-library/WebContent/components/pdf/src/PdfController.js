/*
 * Copyright (C) 2015 NS Solutions Corporation
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
(function() {
	var PREFER_VIEWER_BROWSERPLUGIN = 'browserplugin';
	var PREFER_VIEWER_PDFJS = 'pdfjs';

	/**
	 * コントローラ
	 *
	 * @name h5.ui.components.pdf.PdfController
	 */
	var controller = {
		/**
		 * コントローラ名
		 *
		 * @memberOf h5.ui.components.pdf.PdfController
		 */
		__name: 'h5.ui.components.pdf.PdfController',

		/**
		 * 現在表示中のpdfオブジェクト
		 */
		_pdf: null,

		/**
		 * 現在表示中のページオブジェクト
		 * <p>
		 * _pdf内のページを表す
		 * </p>
		 */
		_page: null,

		/**
		 * 表示スケール
		 */
		_scale: 1,

		/**
		 * 初期化処理
		 *
		 * @memberOf h5.ui.components.pdf.PdfController
		 * @param {Object} context コンテキスト
		 */
		__ready: function(context) {
			var $root = $(this.rootElement);
			// デフォルト
			var preferViewer = $root.data('prefer-viewr') || PREFER_VIEWER_BROWSERPLUGIN;
			var url = $root.data('url');

			if (preferViewer === PREFER_VIEWER_BROWSERPLUGIN && this._hasPDFPlugin()) {
				// ブラウザプラグインでの表示指定かつpdf表示プラグインがある場合はobject要素で表示
				var $object = $('<object></object>');
				$object.attr({
					data: url,
					type: 'application/pdf',
					// 幅、高さはrootに合わせる
					width: $root.width(),
					height: $root.height()
				});
				$root.append($object);

				return;
			}

			// pdfjs指定でPDFJSが読み込まれていなかったらエラー
			if (!window.PDFJS) {
				this.throwError('pdf.jsライブラリが読み込まれていません');
			}

			// 表示するcanvasの作成
			var canvas = document.createElement('canvas');
			this.canvas = canvas;
			// 幅、高さはrootに合わせる
			canvas.width = $root.width();
			canvas.height = $root.height();
			$root.append(canvas);
			this._scale = parseFloat($root.data('scale')) || this._scale;
			if (url) {
				return this.loadPdfDocument(url, preferViewer);
			}
		},

		_hasPDFPlugin: function() {
			// ActiveXObjectがある場合は先にそれを使って判定
			try {
				// ActiveXObjectは直接参照してもundefinedだが、constructorを持つ(IE)
				// そのためActiveXObjectが存在するかどうかの判定はできないのでtry-catchでconstructorにアクセスして確認している
				ActiveXObject.constructor;

				// IEの場合
				function getActiveXObject(name) {
					try {
						return new ActiveXObject(name);
					} catch (e) {
						return;
					}
				}
				if (getActiveXObject('AcroPDF.PDF') || getActiveXObject('PDF.PdfCtrl')) {
					return true;
				}
			} catch (e) {
				// エラーの場合はnavigator.pluginsで判定
			}
			// ActiveXObjectが無いまたはActiveXObjectでpdfプラグインが無い場合はnavigator.pluginsで判定
			var plugins = navigator.plugins;
			return !!(plugins['Chrome PDF Viewer'] || plugins['Adobe Acrobat'] || plugins['WebKit built-in PDF']);
		},

		/**
		 * pdfのロード
		 *
		 * @param url
		 * @param preferViewer
		 * @param [scale=1]
		 * @returns
		 */
		loadPdfDocument: function(url, preferViewer) {
			var dfd = h5.async.deferred();
			PDFJS.getDocument(url).then(this.own(function(pdf) {
				this._pdf = pdf;
				// 1ページ目を取得
				this.getPage(1).done(function() {
					dfd.resolve();
				});
			}));
			return dfd.promise();
		},

		/**
		 * 指定されたindex(1始まり)のページを表示
		 */
		getPage: function(index) {
			if (!this._pdf) {
				this.throwError('PDFドキュメントがロードされていません。loadPdfDocumentを先に呼ぶ必要があります。');
			}
			var dfd = h5.async.deferred();
			this._pdf.getPage(index).then(this.own(function(page) {
				this._page = page;
				// 描画
				page.render({
					canvasContext: this.canvas.getContext('2d'),
					viewport: page.getViewport(this._scale)
				});
				dfd.resolve();
			}));
			return dfd.promise();
		},

		/**
		 * 次のページ
		 */
		nextPage: function() {
			var page = this._page;
			if (!page) {
				return;
			}
			var current = page.pageIndex;
			var numPages = this._pdf.numPages;
			if (numPages <= current + 1) {
				// 次のページが無い
				return;
			}
			this.getPage(current + 2);
		},

		/**
		 * 前のページ
		 */
		prevPage: function() {
			var page = this._page;
			if (!page) {
				return;
			}
			var current = page.pageIndex;
			if (current < 1) {
				// 前のページが無い
				return;
			}
			this.getPage(current);
		},

		/**
		 * 拡大・縮小
		 */
		zoom: function(val) {
			var page = this._page;
			if (!page) {
				return;
			}
			this._scale += val;
			page.render({
				canvasContext: this.canvas.getContext('2d'),
				viewport: page.getViewport(this._scale)
			});
		}

	//		fotToContents: function(){
	//			var page = this._page;
	//			if (!page) {
	//				return;
	//			}
	//			// ページに合わせてcanvasを設定
	//			var viewport = page.getViewport(1);
	//			var canvas = this.canvas;
	//			canvas.height = viewport.height;
	//			canvas.width = viewport.width;
	//		}
	};
	h5.core.expose(controller);
})();