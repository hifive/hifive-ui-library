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

	var ROW_NUM = 2; // 行数(ダミー)
	var COL_NUM = 2; // 列数(ダミー)

	var columnsController = {
		__name: 'h5.ui.components.tileContainer.tileContainerController',

		$dummyColumn: $('<div class="dummy-column">'),

		$columns: [],

		columnSize: 0,

		$currentTarget: null,

		dummyIndex: null,

		/**
		 * カラム移動が強制的にキャンセルされたかどうか
		 */
		forceCanceled: false,

		/**
		 * カラムが移動可能かどうか。 __ready実行後に移動可能にする
		 */
		ableToMove: false,

		__ready: function(context) {
			$(this.rootElement).append(this.$dummyColumn);

			// 保存済みのカラムの順序があればそれを使う
			var order = h5.ui.components.tileContainer.columnOrder;

			var check = false;
			// カラムの順序のカラムの名前があっているかどうかチェック
			if (order
					&& order.length === $(this.rootElement).children(':not(.dummy-column)').length) {
				check = true;
				for (var i = 0, l = order.length; i < l; i++) {
					if (this.$find('#' + order[i]).length === 0) {
						check = false;
						break;
					}
				}
			}

			if (check) {
				// 保存されているカラム順が正しいカラム名だったら
				// その通りの順序に並び替える
				for (var i = 0, l = order.length; i < l; i++) {
					this.$columns.push($(this.rootElement).find('#' + order[i]));
					this.columnSize++;
				}
			} else {
				// $columnsに現在の状態を追加
				var that = this;
				$(this.rootElement).children(':not(.dummy-column)').each(function() {
					that.$columns.push($(this));
					$(this).css('z-index', '0');
					that.columnSize++;
				});
			}

			this.moveColumns();
			this.ableToMove = true;
		},

		_getSize: function($column) {
			var classArray = $column.attr('class').split(' ');
			var size = 1;
			for (var i = 0, l = classArray.length; i < l; i++) {
				if (h5.u.str.startsWith(classArray[i], 'column')) {
					size = Math.max(parseInt(classArray[i].slice(6) || 1), size);
				}
			}
			return size;
		},

		/**
		 * 設定を保存ボタンから呼ばれるイベント カラムの位置を保存する
		 */
		'{rootElement} _save': function(context) {
			var order = [];
			for (var i = 0, len = this.$columns.length; i < len; i++) {
				order.push(this.$columns[i].attr('id'));
			}
			training.common.data.columnOrder = order;
		},

		'.header h5trackstart': function(context) {
			if (!this.ableToMove) {
				return;
			}

			this.forceCanceled = false;
			context.event.preventDefault();

			this.$currentTarget = $(context.event.target).parent();
			var marginLeft = parseInt(this.$currentTarget.css('margin-left'));
			var marginTop = parseInt(this.$currentTarget.css('margin-top'));

			this.$currentTarget.css('z-index', 1);
			this.$currentTarget.addClass('dragging');

			this.$dummyColumn.toggle();

			this.currentTargetSize = this._getSize(this.$currentTarget);
			this.$dummyColumn.addClass('column');
			this.$dummyColumn.addClass('column' + this.currentTargetSize);

			this.$dummyColumn.css({
				width: this.$currentTarget.width(),
				height: this.$currentTarget.height(),
				left: this.$currentTarget.offset().left - marginLeft,
				top: this.$currentTarget.offset().top - marginTop
			});

			// dummyColumnを配列内の対象と置き換える
			this._setDummyIndex();
		},

		_setDummyIndex: function() {
			for (var i = 0, len = this.$columns.length; i < len; i++) {
				if (this.$columns[i][0] === this.$currentTarget[0]) {
					this.$columns[i] = this.$dummyColumn;
					this.dummyIndex = i;
					break;
				}
			}

		},

		'.header h5trackmove': function(context) {
			if (!this.ableToMove) {
				return;
			}
			if (this.forceCanceled) {
				return;
			}
			context.event.preventDefault();

			var dx = context.event.dx;
			var dy = context.event.dy;
			var offset = this.$currentTarget.offset();
			var marginLeft = parseInt(this.$currentTarget.css('margin-left'));
			var marginTop = parseInt(this.$currentTarget.css('margin-top'));

			this.move(offset.left + dx - marginLeft, offset.top + dy - marginTop);
		},

		'.header h5trackend': function(context) {
			if (!this.ableToMove) {
				return;
			}

			this.$columns[this.dummyIndex] = this.$currentTarget;
			this.moveColumns();

			this.$currentTarget.css('z-index', 0);
			this.$dummyColumn.removeClass('column');
			this.$dummyColumn.removeClass('column' + this.currentTargetSize);
			this.$dummyColumn.css('display', 'none');
		},

		/**
		 * 指定された位置へ移動
		 *
		 * @param x x座標
		 * @param y y座標
		 * @memberOf h5.ui.components.tileContainer.tileContainerController
		 */
		move: function(x, y) {
			// 移動中のカラムをマウスに追従させる
			this.$currentTarget.css({
				left: x,
				top: y
			});

			// カラムが2つ未満なら何もしない
			if (this.columnSize < 2) {
				return;
			}

			// 移動中のカラムと一番近いカラム(のインデックス)を取得する
			var currentCenter = this.getCenter(this.$currentTarget);
			var d = Infinity;
			var targetIndex;
			for (var j = 0, l = this.$columns.length; j < l; j++) {
				// 移動中のカラムの中心位置と各カラムの中心位置との距離を計測して、最小値をとる
				var center = this.getCenter(this.$columns[j]);
				var tempD = Math.pow(currentCenter.x - center.x, 2)
						+ Math.pow(currentCenter.y - center.y, 2);
				if (d > tempD) {
					d = tempD;
					targetIndex = j;
				}
			}

			if (targetIndex === this.dummyIndex) {
				return;
			}

			// 配列内のdummyColumnを現在の位置へ移動する
			this.$columns.splice(this.dummyIndex, 1);
			this.$columns.splice(targetIndex, 0, this.$dummyColumn);

			// カラムを今の順番で移動させる
			var dummyIndex = this.dummyIndex;
			this.dummyIndex = targetIndex;
			if (dummyIndex > targetIndex) {
				this.moveColumns(targetIndex, dummyIndex);
			} else {
				this.moveColumns(dummyIndex, targetIndex);
			}
		},

		/**
		 * カラムの移動終了時の処理
		 *
		 * @memberOf h5.ui.components.tileContainer.tileContainerController
		 */
		moveColumns: function(from, to) {
			var offset = $(this.rootElement).offset();
			var left = offset.left;
			var top = offset.top;
			// var width = $('body').width();

			if (from === undefined) {
				from = 0;
			}
			if (to === undefined) {
				to = this.$columns.length - 1;
			}

			var rowSize = 0;
			var height = 0;
			for (var i = 0, len = this.$columns.length; i < len; i++) {
				var $div = this.$columns[i];
				var size = this._getSize($div);
				if (rowSize + size > ROW_NUM) {
					// はみ出たとき
					// 当てはまるものを探しにいく
					for (var j = i; j < len; j++) {
						var $jthColumn = this.$columns[j];
						var tempSize = this._getSize($jthColumn);
						if (rowSize + tempSize > ROW_NUM) {
							continue;
						}
						// i番目とj番目を入れ替える
						this.$columns[j] = $div;
						$div = $jthColumn;
						this.$columns[i] = $jthColumn;
						size = tempSize;
						if (this.dummyIndex === i) {
							this.dummyIndex = j;
						} else if (this.dummyIndex === j) {
							this.dummyIndex = i;
						}
						break;
					}
				}
				$div.css({
					left: left,
					top: top
				});
				height = Math.max(height, $div.outerHeight()
						+ Math.round(parseFloat($div.css('margin-top')))
						+ Math.round(parseFloat($div.css('margin-bottom'))));

				left += $div.outerWidth() + Math.round(parseFloat($div.css('margin-left')))
						+ Math.round(parseFloat($div.css('margin-right')));

				rowSize += size;

				if (rowSize === ROW_NUM) {
					left = offset.left;
					top += height;
					rowSize = 0;
					height = 0;
				}
			}
		},

		getCenter: function($target) {
			var offset = $target.offset();

			return {
				x: offset.left + $target.width() / 2,
				y: offset.top + $target.height() / 2
			};
		}
	};
	h5.core.expose(columnsController);
})();