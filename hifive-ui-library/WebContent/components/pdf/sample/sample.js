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
(function() {
	/**
	 * コントローラ
	 *
	 * @name sample.PageController
	 */
	var controller = {
		/**
		 * コントローラ名
		 *
		 * @memberOf sample.PageController
		 */
		__name: 'sample.PageController',

		/**
		 * pdfコントローラ
		 *
		 * @memberOf sample.PageController
		 */
		pdfController: h5.ui.components.pdf.PdfController,

		/**
		 * 子コントローラのメタ定義
		 *
		 * @memberOf sample.PageController
		 */
		__meta: {
			pdfController: {
				rootElement: '.pdf-view'
			}
		},

		/**
		 * 初期化処理
		 *
		 * @memberOf sample.PageController
		 * @param {Object} context コンテキスト
		 */
		__ready: function(context) {},

		/**
		 *
		 */
		'.nextpage click': function() {
			this.pdfController.nextPage();
		},
		/**
		 *
		 */
		'.prevpage click': function() {
			this.pdfController.prevPage();
		},
		/**
		 *
		 */
		'.zoom-plus click': function() {
			this.pdfController.zoom(0.1);
		},
		/**
		 *
		 */
		'.zoom-minus click': function() {
			this.pdfController.zoom(-0.1);
		}
	};
	h5.core.expose(controller);
})();