/*
 * Copyright (C) 2014 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

(function($) {

	// =========================================================================
	//
	// 外部定義のインクルード
	//
	// =========================================================================

	// =========================================================================
	//
	// スコープ内定数
	//
	// =========================================================================
	/** エディタの入力内容が変更された時に上げるイベント名 */
	var EVENT_TEXT_CHANGE = 'textChange';

	/** EVENT_TEXT_CHANGEイベントを遅延させる時間(ms) */
	var TEXT_CHANGE_DEFAULT_DELAY = 100;

	// =========================================================================
	//
	// スコープ内静的プロパティ
	//
	// =========================================================================

	// =============================
	// スコープ内静的変数
	// =============================

	// =============================
	// スコープ内静的関数
	// =============================

	// =========================================================================
	//
	// スコープ内クラス
	//
	// =========================================================================

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================

	/**
	 * Aceエディタを扱うコントローラ
	 *
	 * @class
	 * @name h5.ui.components.aceEditor.controller.AceEditorController
	 */
	var aceEditorController = {
		/**
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 */
		__name: 'h5.ui.components.aceEditor.controller.AceEditorController',

		/**
		 * textChange待機用タイマーID
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 */
		_textChangeDelayr: null,

		/**
		 * textChange待機時間
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 */
		_textChangeDelay: TEXT_CHANGE_DEFAULT_DELAY,

		/**
		 * Aceエディタインスタンス
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 */
		editor: null,

		/**
		 * エディタコンテナ
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 */
		$editorContainer: null,

		/**
		 * 初期化処理。コントローラバインド時にAceエディタを作成する
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 */
		__ready: function() {
			this.editor = ace.edit(this.rootElement);
			this.$editorContainer = $(this.editor.container);
			// イベントのバインド
			this.editor.on('change', this.own(this._change));
		},

		/**
		 * エディタの現在のEditorSessionを取得
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 * @param {String} mode
		 */
		getSession: function(mode) {
			return this.editor.getSession();
		},

		/**
		 * エディタのモードを設定('html','js','ejs'など)
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 * @param {String} mode
		 */
		setMode: function(mode) {
			this.editor.getSession().setMode('ace/mode/' + mode);
		},

		/**
		 * エディタに文字列を入力する
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 * @param {String} val
		 */
		setValue: function(val) {
			this.editor.setValue(val, 1);
		},

		/**
		 * エディタに入力された文字列を取得
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 * @returns {String}
		 */
		getValue: function() {
			return this.editor.getValue();
		},

		/**
		 * 現在の表示サイズに要素を調整
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 */
		adjustSize: function() {
			this.editor.resize(true);
		},

		/**
		 * エディタの内容が変更された時のイベント(textChangeイベント)をあげるときの遅延時間の設定
		 * <p>
		 * デフォルトは100msです
		 * </p>
		 *
		 * @param {time} 遅延時間(ms)。 0を指定した場合は遅延なし。
		 */
		setTextChangeDelay: function(time) {
			this._textChangeDelay = time;
		},

		/**
		 * エディタの内容が変更された時のハンドラ(createEditor時にイベントハンドリングする関数)
		 * <p>
		 * 変更時にこのコントローラからtextChangeイベントをあげる
		 * </p>
		 *
		 * @memberOf h5.ui.components.aceEditor.controller.AceEditorController
		 * @private
		 */
		_change: function() {
			// textChangeイベントを遅延させてあげる
			// (setValue時やペースト時にエディタのchangeイベントが連続して発生するため)
			if (this._textChangeDelayr) {
				clearTimeout(this._textChangeDelayr);
			}
			if (this._textChangeDelay <= 0) {
				// 遅延なし
				this.trigger(EVENT_TEXT_CHANGE);
				return;
			}
			var that = this;
			this._textChangeDelayr = setTimeout(this.own(function() {
				that._textChangeDelayr = null;
				that.$editorContainer.trigger(EVENT_TEXT_CHANGE);
			}), this._textChangeDelay);
		}
	};
	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================
	h5.core.expose(aceEditorController);
})(jQuery);
