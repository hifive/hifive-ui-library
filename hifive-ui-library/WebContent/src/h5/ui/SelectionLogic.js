(function() {

	//TODO クラスとして記述

	/**
	 * <p>
	 * セレクションロジック。 オブジェクトの「選択」と「フォーカス」の論理状態を管理する機能を提供。<br>
	 * 「フォーカス」＝同時には1つしか存在しない、今まさに注目しているオブジェクト <br>
	 * 「選択」＝選んであるオブジェクト。複数存在しうる。
	 * </p>
	 *
	 * @name h5.ui.SelectionLogic
	 * @class
	 */
	var selectionLogic = {
		/**
		 * @memberOf h5.ui.SelectionLogic
		 * @private
		 */
		__name: 'h5.ui.SelectionLogic',

		/**
		 * 選択されているオブジェクトの配列
		 *
		 * @instance
		 * @private
		 */
		_selected: [],

		/**
		 * フォーカスされているオブジェクト
		 *
		 * @instance
		 * @private
		 */
		_focused: null,

		/**
		 * 引数に渡されたオブジェクトが選択状態かどうか判定して返す
		 *
		 * @instance
		 * @param {Any} obj
		 * @returns {Boolean}
		 */
		isSelected: function(obj) {
			return $.inArray(obj, this._selected) !== -1;
		},

		isFocused: function(obj) {
			return obj === this._focused;
		},

		/**
		 * 選択されているオブジェクトのリストを返す
		 *
		 * @instance
		 * @returns {Any[]}
		 */
		getSelected: function() {
			return this._selected;
		},

		/**
		 * フォーカスされているオブジェクトを返す
		 *
		 * @instance
		 * @returns {Any}
		 */
		getFocused: function() {
			return this._focused;
		},

		/**
		 * オブジェクトをフォーカス状態にする
		 *
		 * @instance
		 */
		focus: function(obj) {
			if (!this.isSelected(obj)) {
				//非選択状態であれば自動的に選択状態に(追加)する
				this.select(obj);
			}

			this._focused = obj;

			this._dispatchSelectionChangeEvent(obj, true, true);
		},

		/**
		 * フォーカス状態のオブジェクトを非フォーカス状態にする。フォーカス状態のオブジェクトがない場合は何もしない。
		 *
		 * @instance
		 * @param {Boolean} [andUnselect=true] trueの場合はunselectも実行する(デフォルトtrue)
		 * @returns フォーカスが当たっていたオブジェクト
		 */
		unfocus: function(andUnselect) {
			if (!this._focused) {
				return null;
			}

			var focused = this._focused;
			this._focused = null;
			if (andUnselect !== false) {
				this.unselect(focused);
			}

			//andUnselectがfalseの場合、フォーカスは外すが選択状態は残す
			this._dispatchSelectionChangeEvent(focused, andUnselect === false, false);

			return focused;
		},

		/**
		 * 引数に渡されたオブジェクトを選択状態にする
		 * <p>
		 * 既に選択状態であるオブジェクトは無視します
		 * </p>
		 *
		 * @instance
		 * @param {Any|Any[]} objs 配列で渡された場合はその中身を選択対象として扱います
		 * @param {Boolean} isExclusive trueが指定された場合、現在選択されているものを全て解除して、引数に渡されたものだけを選択状態にする
		 * @returns {Any[]} 実際に選択されたオブジェクトの配列を返す(既に選択済みだったものは除く)
		 */
		select: function(objs, isExclusive) {
			if (isExclusive) {
				this.unselectAll();
			}
			var objs = $.isArray(objs) ? objs : [objs];

			// デフォルトで、先頭のものをfocus状態にする
			var shouldRefocus = this._selected.length === 0;

			var actuals = [];

			for (var i = 0, l = objs.length; i < l; i++) {
				var obj = objs[i];
				if (this.isSelected(obj)) {
					// 選択済みなら何もしない
					continue;
				}

				this._selected.push(obj);
				actuals.push(obj);
			}
			if (actuals.length && shouldRefocus) {
				// フォーカスされているものが無ければ、今回追加したものの先頭をフォーカスする
				this.focus(actuals[0]);
			}

			for (var i = 0, len = actuals.length; i < len; i++) {
				var obj = actuals[i];
				this._dispatchSelectionChangeEvent(obj, true, this.isFocused(obj));
			}

			return actuals;
		},

		/**
		 * 引数に渡されたオブジェクトの選択状態を解除する
		 * <p>
		 * 選択状態ではないオブジェクトは無視します
		 * </p>
		 *
		 * @instance
		 * @param {Any|Any[]} objs 配列で渡された場合はその中身を選択解除する対象として扱います
		 * @returns {Any[]} 実際に選択の解除されたオブジェクトの配列を返す(既に選択状態ではなかったものは除く)
		 */
		unselect: function(objs) {
			var objs = $.isArray(objs) ? objs : [objs];
			var actuals = [];
			for (var i = 0, l = objs.length; i < l; i++) {
				var obj = objs[i];
				if (this.isSelected(obj)) {
					var idx = $.inArray(obj, this._selected);
					if (idx === -1) {
						continue;
					}
					// 選択状態を解除
					var spliced = this._selected.splice(idx, 1);
					actuals.push(spliced[0]);
					if (this._focus === obj) {
						// フォーカス状態ならフォーカスも解除
						this._focus = null;
					}
				}
			}

			for (var i = 0, len = actuals.length; i < len; i++) {
				var obj = actuals[i];
				this._dispatchSelectionChangeEvent(obj, false, false);
			}

			return actuals;
		},

		/**
		 * 全ての選択状態のオブジェクトについて選択状態を解除する
		 *
		 * @instance
		 * @returns {Any[]} 実際に選択の解除されたオブジェクトの配列を返す
		 */
		unselectAll: function() {
			var oldSelected = this._selected;
			this._selected = [];
			this._focused = null;

			//TODO 仮実装
			for (var i = 0, len = oldSelected.length; i < len; i++) {
				var obj = oldSelected[i];
				this._dispatchSelectionChangeEvent(obj, false, false);
			}

			return oldSelected;
		},

		_dispatchSelectionChangeEvent: function(obj, isSelected, isFocused) {
			var listeners = this._listeners;
			for (var i = 0, len = listeners.length; i < len; i++) {
				var listener = listeners[i];
				listener(obj, isSelected, isFocused);
			}
		},

		_listeners: [],

		//func(du, isSelected, isFocused)
		addSelectionListener: function(func) {
			//TODO 普通のEventDispatcherに変える
			this._listeners.push(func);
		}
	};
	h5.core.expose(selectionLogic);
})();