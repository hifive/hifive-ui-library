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
			if (obj === this._focused) {
				//新たにフォーカスを当てる要素が現在フォーカスが当たっている要素そのものの場合は何もしない
				return;
			}

			var oldFocused = this._focused;

			var newSelected = null;
			if (!this.isSelected(obj)) {
				//非選択状態であれば自動的に選択状態に(追加)する
				this._select(obj);
				newSelected = [obj];
			} else {
				//既に選択済みだったので、新規選択リストは空をセット
				newSelected = [];
			}

			this._focused = obj;

			this._dispatchSelectionChangeEvent(newSelected, [], oldFocused);
		},

		/**
		 * フォーカス状態のオブジェクトを非フォーカス状態にする。フォーカス状態のオブジェクトがない場合は何もしない。
		 *
		 * @instance
		 * @param {Boolean} [andUnselect=true] trueの場合はunselectも実行する(デフォルトtrue)
		 * @returns フォーカスが当たっていたオブジェクト。もともとフォーカスが当たったオブジェクトがない場合はnull
		 */
		unfocus: function(andUnselect) {
			if (!this._focused) {
				return null;
			}

			var unselected = null;
			var focused = this._focused;
			this._focused = null;
			if (andUnselect !== false) {
				unselected = this._unselect(focused);
			} else {
				//andUnselectがtrueの場合は、unselectされるものはないので空配列をセットする
				unselected = [];
			}

			this._dispatchSelectionChangeEvent([], unselected, focused);

			return focused;
		},

		/**
		 * 引数に渡されたオブジェクトを選択状態にします。
		 *
		 * @instance
		 * @param {Any|Any[]} objs 配列で渡された場合はその中身を選択対象として扱います
		 * @param {Boolean} isExclusive
		 *            trueが指定された場合、現在選択されているものを全て解除して、引数に渡されたものだけを選択状態にする。デフォルト：false。
		 * @returns {Any[]} 実際に選択されたオブジェクトの配列を返す(既に選択済みだったものは除く)
		 */
		select: function(objs, isExclusive) {
			//TODO このコードだと、select(null)でnullは選択できない。しかし、select([null])は通ってしまう。仕様としてnullは選択不可とするべきか？
			if (isExclusive !== true
					&& (objs == null || (Array.isArray(objs) && objs.length === 0))) {
				//排他的選択でなく、かつ選択対象が何もない（nullまたは配列の要素数が0）場合は
				//選択状態は何も変化しない
				return 0;
			}

			var result = this._select(objs, isExclusive);
			return result.actuals;
		},

		/**
		 * 選択処理の実体です。
		 *
		 * @private
		 * @param objs
		 * @param isExclusive
		 * @returns {___anonymous4240_4326}
		 */
		_select: function(objs, isExclusive) {
			var oldFocused = this._focused;
			var unselected = null;

			if (isExclusive === true) {
				unselected = this._unselectAll();
			} else {
				//isExclusiveがfalseの場合は、今回unselectされるものはないので空配列をイベントのchangesに入れる
				unselected = [];
			}

			objs = Array.isArray(objs) ? objs : [objs];

			// デフォルトで、先頭のものをfocus状態にする
			var shouldRefocus = this._selected.length === 0;

			var actuals = [];

			var isActuallyUnselected = true;
			if (unselected.length === 0) {
				isActuallyUnselected = false;
			}

			for (var i = 0, l = objs.length; i < l; i++) {
				var obj = objs[i];

				if (isActuallyUnselected) {
					//unselectedのうち今回選択する要素は除外する
					//このメソッドの終了時にobjは必ず選択されるので、
					//選択済みかどうかに関わらずこのフィルタ処理を行う
					var reselectIdx = $.inArray(obj, unselected);
					if (reselectIdx !== -1) {
						//TODO splice()とfilter()で新しい配列を作るのとで速度比較
						unselected.splice(reselectIdx, 1);
					}
				}
				//TODO unselectAllを最初にやってしまうと、ここのisSelectedのチェックの意味がなくなり
				//actualsがおかしくなる
				if (this.isSelected(obj)) {
					// 選択済みなら何もしない
					continue;
				}

				this._selected.push(obj);
				actuals.push(obj);
			}
			if (actuals.length > 0 && shouldRefocus) {
				// フォーカスされているものが無ければ、今回追加したものの先頭をフォーカスする
				this._focused = actuals[0];
			}

			this._dispatchSelectionChangeEvent(actuals, unselected, oldFocused);

			return {
				actuals: actuals,
				unselected: unselected,
				oldFocused: oldFocused
			};
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
			//unselect()するとフォーカス状態も変わってしまうので、先に以前の状態を覚えておく
			var oldFocused = this._focused;

			var unselected = this._unselect(objs);

			if (unselected.length > 0) {
				//実際に非選択状態になったものがある場合のみイベントを発火させる
				this._dispatchSelectionChangeEvent([], unselected, oldFocused);
			}

			return unselected;
		},

		/**
		 * @private
		 * @param objs
		 * @returns {Array}
		 */
		_unselect: function(objs) {
			var objs = $.isArray(objs) ? objs : [objs];
			var unselected = [];
			for (var i = 0, l = objs.length; i < l; i++) {
				var obj = objs[i];
				if (this.isSelected(obj)) {
					var idx = $.inArray(obj, this._selected);
					if (idx === -1) {
						continue;
					}
					// 選択状態を解除
					var spliced = this._selected.splice(idx, 1);
					unselected.push(spliced[0]);
					if (this._focused === obj) {
						// フォーカス状態ならフォーカスも解除
						this._focused = null;
					}
				}
			}

			return unselected;
		},

		/**
		 * 全ての選択状態のオブジェクトについて選択状態を解除する
		 *
		 * @instance
		 * @returns {Any[]} 実際に選択の解除されたオブジェクトの配列を返す
		 */
		unselectAll: function() {
			var oldFocused = this._focused;
			var oldSelected = this._unselectAll();

			this._dispatchSelectionChangeEvent([], oldSelected, oldFocused);

			return oldSelected;
		},

		/**
		 * 全ての選択状態のオブジェクトについて選択状態を解除する（イベントは発生させない）
		 *
		 * @private
		 * @instance
		 * @returns {Any[]} 実際に選択の解除されたオブジェクトの配列を返す
		 */
		_unselectAll: function() {
			var oldSelected = this._selected;
			this._selected = [];
			this._focused = null;

			return oldSelected;
		},

		/**
		 * このSelectionLogicインスタンスからselectionChangeイベントを発生させます。
		 *
		 * @private
		 * @param newSelected 新規に選択されたオブジェクトの配列
		 * @param unselected 非選択状態になったオブジェクトの配列
		 * @param unfocused フォーカスが外れたオブジェクトの配列
		 */
		_dispatchSelectionChangeEvent: function(newSelected, unselected, unfocused) {
			var event = {
				type: 'selectionChange',
				selected: this._selected,
				focused: this._focused,
				changes: {
					selected: newSelected,
					unselected: unselected,
					unfocused: unfocused
				}
			};
			this.dispatchEvent(event);
		}
	};

	h5.mixin.eventDispatcher.mix(selectionLogic);

	h5.core.expose(selectionLogic);
})();