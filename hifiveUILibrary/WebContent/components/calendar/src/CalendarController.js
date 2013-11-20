/*
 * Copyright (C) 2013 NS Solutions Corporation
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
(function($){

	// =========================================================================
	//
	// 外部定義のインクルード
	//
	// =========================================================================

	// TODO 別ファイルで定義されている定数・変数・関数等を別の名前で使用する場合にここに記述します。
	// 例：var getDeferred = h5.async.deferred;

	// =========================================================================
	//
	// スコープ内定数
	//
	// =========================================================================

	// 週間の日名
	var dowNames = ['日', '月', '火', '水', '木', '金', '土'];

	// 月名
	var monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];


	// =========================================================================
	//
	// スコープ内静的コード
	//
	// =========================================================================

	// =============================
	// スコープ内静的変数
	// =============================

	// TODO このスコープで共有される変数（クラス変数）を記述します。
	// 例：var globalCounter = 0;

	// =============================
	// スコープ内静的関数
	// =============================

	// TODO このスコープで共有される関数を記述します。
	// 例：function formatText(format, text){ ... }


	// =========================================================================
	//
	// スコープ内疑似クラス
	//
	// =========================================================================

	//TODO このスコープで使用される疑似クラス（コンストラクタ関数とそのプロトタイプ等）を記述します。

	// =========================================================================
	//
	// メインコード（コントローラ・ロジック等）
	//
	// =========================================================================

	//TODO コントローラやロジックを記述します。
	/**
	 * カレンダーコントローラ
	 *
	 * @class
	 * @name Calendar
	 * @memberOf h5.ui.components
	 */
	var calendarController = {
		/**
		 * コントローラ名(必須)
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type String
		 */
		__name: 'h5.ui.components.Calendar',

		/**
		 * 日のクラス
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type 定数
		 */
		dowNameClasses: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],

		/**
		 * DOMカレンダー要素のID
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type String
		 */
		id: null,

		/**
		 * カレンダーを添付される要素
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type
		 */
		_root: null,

		/**
		 * カレンダーでの選択方('single':特定の1日, 'continue':連続する日, 'multi':複数の日)
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type String
		 */
		selectMode: null,

		/**
		 * 選択した日付
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Array
		 */
		_selectedDate: [],

		/**
		 * 月の最初の日(表示中の日付の指定用)
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Date
		 */
		_firstDate: null,

		/**
		 * 今日
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Date
		 */
		todayDate: new Date(),

		/**
		 * ←と→のアイコン（全前の月の移動用）
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Date
		 */
		prevArrow: '\u25c4',
		nextArrow: '\u25ba',

		/**
		 * カレンダーのサイズ（pixelで計測する）
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Integer
		 */
		size: 0,

		/**
		 * 選択できない日付
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Array
		 */
		_unselectableDates: [],

		/**
		 * Cssでカスタマイズされている週間の日
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Map
		 */
		_userCssDow: {},

		/**
		 * 特別の日（Cssでカスタマイズされている日、マーカー日又は、ツールチップがある日）
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Map
		 */
		_specialDates: {},

		/**
		 * 表示される月の数
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Integer
		 */
		_monthCount: 1,

		/**
		 * 初期処理
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param context
		 */
		__init: function(context) {

			// 初期
			this._root = $(this.rootElement);
			this.size = 400;
			this.todayDate.setHours(0, 0, 0, 0);
			this.selectMode = 'single';

			// 全ての要素のClass
			this.coreClass = ' core border ';

			this.option = {
				maxRow: 6,
				maxCol: 7,
				borderSize: 1,
				cellWidth: 0,
				cellHeight: 0
			};
			// カレンダーのサイズに基づいて、日のCellのサイズを計測する
			this.option.cellWidth = this._getCellSize(this.size, this.option.maxCol);
			this.option.cellHeight = this._getCellSize(this.size, this.option.maxRow + 2);



			// 選択されている月の最初の日
			this._firstDate = new Date(this.todayDate);
			this._firstDate.setDate(1);

			//Gen calendar Id
			this.id = 'calendar_' + Math.round(Math.random() * 1e10);

			// Gen with number of months displayed
			this._monthCount = 1;
			this._render();
		},

		/**
		 * カレンダー部分のUIを生成する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 */
		_render: function() {

			var root = this._root;

			// カレンダーのの枠のDOMを作成する
			var calendar = this.$find('#' + this.id);
			if (calendar.length == 0) {
				calendar = $('<div/>').attr('id', this.id);
				calendar.data('is', true);
				root.append(calendar);
			}
			calendar.addClass('calendar');
			calendar.children().remove();

			var defaultGroup = this._renderMonth(this._firstDate);
			defaultGroup.attr('id', this.id + '_group0');
			calendar.append(defaultGroup);
			for ( var i = 1; i < this._monthCount; i++) {
				var group = this._renderMonth(this.getFirstDate(this._firstDate, i));
				group.attr('id', this.id + '_group' + i);
				calendar.append(group);
			}
		},

		/**
		 * 日に基づいて、月のカレンダーを生成する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param firstDate
		 * @returns UI要素
		 */
		_renderMonth: function(firstDate) {
			var that = this;
			var option = this.option;

			// 日と月名の配列
			var dowNameClasses = this.dowNameClasses;

			// 既定のカレンダー
			var group = $('<table />').data('is', true);
			group.css({
				width: (option.cellWidth * option.maxCol) + 'px',
				margin: '1px',
			//横方向又は、縦方向で表示する
			//float: 'left'
			});

			var title = this._renderTitle(firstDate, option);
			group.append(title);

			// カレンダーで、最初の日を取得する（先月の日）
			var startDate = new Date(firstDate);
			var startOffset = startDate.getDay();
			if (startOffset == 0) {
				startDate.setDate(startDate.getDate() - 7);
			} else {
				startDate.setDate(startDate.getDate() - startOffset);
			}

			// Add all the cells to the calendar
			for ( var row = 0, cellIndex = 0; row < option.maxRow + 1; row++) {
				var rowLine = $('<tr/>');
				for ( var col = 0; col < option.maxCol; col++, cellIndex++) {
					var cellDate = new Date(startDate);
					var cellClass = 'day';
					var cell = $('<td/>');

					// row = Oの場合、週間の日付
					if (!row) {
						cellClass = 'dow';
						cell.html(dowNames[col]);
						cellDate = null;

						// Assign other properties to the cell
						cell.addClass(this.coreClass + cellClass);
						cell.css({
							height: option.cellHeight + 'px',
							lineHeight: option.cellHeight + 'px',
							borderTopWidth: option.borderSize,
							borderBottomWidth: option.borderSize,
							borderLeftWidth: (row > 0 || (!row && !col)) ? option.borderSize : 0,
							borderRightWidth: (row > 0 || (!row && col == 6)) ? option.borderSize
									: 0,
						});
					} else {
						var specialData = '';
						// Get the new date for this cell
						cellDate.setDate(cellDate.getDate() + col + ((row - 1) * option.maxCol));

						// Get value for this date
						var cellDateTime = cellDate.getTime();

						// Assign date for the cell
						cell.html(cellDate.getDate());
						// Handle active dates and weekends
						var classDow = dowNameClasses[cellDate.getDay()];
						cellClass += ' ' + classDow;

						// 選択できないデートのハンドル
						if ($.inArray(cellDate.getTime(), this._unselectableDates) != -1) {
							cellClass += ' noday';
						} else {
							// 先月の日のハンドル
							if (firstDate.getMonth() != cellDate.getMonth()) {
								cellClass += ' outday';
							}
							// 今日のハンドル
							if (this.todayDate.getTime() == cellDateTime) {
								cellClass += ' today';
							}
							// 選択したデートのハンドル
							var dates = this.getSelectedDate();
							for ( var i = 0; i < dates.length; i++) {
								if (this._compareDate(cellDate, dates[i]) == 0) {
									cellClass += ' selected';
									break;
								}
							}

							// 特別の日のハンドル
							if (this._specialDates.hasOwnProperty(cellDate)) {
								var date = this._specialDates[cellDate];
								for ( var i in date) {
									if (i == 'isMark') {
										if (date['isMark']) {
											cell.append("<br/>●");
										}
									} else if (i == 'data') {
										if (date['data'] != '') {
											specialData = date['data'];
										}
									} else if (i == 'cssClass') {
										if (date['cssClass'] != 'default') {
											cellClass += ' ' + date['cssClass'];
										}
									}
								}
							}

							if (this._userCssDow.hasOwnProperty(classDow)) {
								cellClass += ' ' + this._userCssDow[classDow];
							}

							cell.mouseover(
									function() {
										var clickedData = $(this).data('data');
										if (clickedData.data) {
											var text = clickedData.data;
											$(this).append(
													'<div class="tooltips" style="top:'
															+ option.cellHeight + 'px">' + text
															+ '</div>');
										}
									}).mouseout(function() {
								$(this).find(".tooltips").remove();
							}).mousedown(function() {
								return false;
							}).click(function(e) {
								e.stopPropagation();

								// Get the data from this cell
								var clickedData = $(this).data('data');

								// Save date to selected and first
								switch (that.selectMode) {
								case 'continue':
									if (that._selectedDate.length <= 1) {
										that._selectedDate.push(new Date(clickedData.date));
									} else {
										that._selectedDate[0] = new Date(that._selectedDate[1]);
										that._selectedDate[1] = new Date(clickedData.date);
									}
									break;
								case 'multi':
									that._selectedDate.push(new Date(clickedData.date));
									break;
								default:
									that._selectedDate[0] = clickedData.date;
									break;
								}

								that.setFirstDate(clickedData.date);
							});
						}

						// Assign other properties to the cell
						cell.data('data', {
							date: cellDate,
							data: specialData
						}).addClass(this.coreClass + cellClass).css({
							width: option.cellWidth + 'px',
							height: option.cellHeight + 'px',
							lineHeight: option.cellHeight / 3 + 'px',
							borderWidth: option.borderSize,
						});
					}

					// Add cell to calendar
					rowLine.append(cell);
				}
				group.append(rowLine);
			}

			return group;
		},

		//

		/**
		 * カレンダーのタイトルを生成する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param firstDate
		 * @param option Use for setting CSS
		 * @returns Dom要素
		 */
		_renderTitle: function(firstDate, option) {
			var that = this;
			// 前後の月の最初日を取得する
			var prevFirstDate = this.getFirstDate(firstDate, -1);
			var nextFirstDate = this.getFirstDate(firstDate, 1);

			// Gather flags for prev/next arrows
			var showPrev = (this._compareDate(firstDate, this._firstDate) == 0);
			var lastMonthDate = this.getFirstDate(this._firstDate, this._monthCount - 1);
			var showNext = (this._compareDate(firstDate, lastMonthDate) == 0);

			var monyearClass = this.coreClass + 'monyear ';
			var title = $('<tr/>').css({
				height: option.cellHeight + 'px',
				lineHeight: option.cellHeight + 'px',
				borderWidth: option.borderSize + 'px',
			});
			title.addClass(this.coreClass);

			// Create the arrows and title
			var prevCell = $('<td/>').addClass(monyearClass + 'prev-arrow ');
			prevCell.append(
					$('<a/>').addClass('prev-arrow' + (showPrev ? '' : '-off'))
							.html(this.prevArrow)).mousedown(function() {
				return false;
			}).click(function(e) {
				if (showPrev) {
					e.stopPropagation();
					that.setFirstDate(prevFirstDate);
				}
			});

			var titleCell = $('<td colspan="5"/>').addClass(monyearClass + 'title');
			var firstDateMonth = firstDate.getMonth();
			var monthText = $('<span/>').html(monthNames[firstDateMonth]);
			var yearText = $('<span/>').html(firstDate.getFullYear());
			var titleYearMonth = $('<div/>').append(monthText).append(yearText);
			titleCell.append(titleYearMonth);

			var nextCell = $('<td/>').addClass(monyearClass + 'next-arrow ');
			nextCell.append(
					$('<a/>').addClass('next-arrow' + (showNext ? '' : '-off'))
							.html(this.nextArrow)).mousedown(function() {
				return false;
			}).click(function(e) {
				if (showNext) {
					e.stopPropagation();
					that.setFirstDate(nextFirstDate);
				}
			});

			// Add cells for prev/title/next
			title.append(prevCell).append(titleCell).append(nextCell);
			return title;
		},

		/**
		 * 任意のサイズ（px）に基づいて、日のUIのサイズを計測する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param _size
		 * @param _count
		 * @returns セルのサイズ 補充：カレンダーUIをテーブルで表示される。この関数をセル要素のサイズを計測する。
		 */
		_getCellSize: function(_size, _count) {
			return (_size / _count) + ((1 / _count) * (_count - 1));
		},

		/**
		 * Dateオブジェクトの比較
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date1
		 * @param date2
		 * @returns 0: date1 = date2
		 */
		_compareDate: function(date1, date2) {
			if (date1.getTime() == date2.getTime()) {
				return 0;
			} else if (date1.getTime() < date2.getTime()) {
				return 1;

			} else {
				return 2;
			}
		},

		/**
		 * 選択されていた日付を変更する
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date
		 */
		setDate: function(date) {
			this._selectedDate[0] = date;
			this.setFirstDate(date);
		},

		/**
		 * 表示中の月に、最初の日を設定する。表示中のカレンダーを変更する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date
		 */
		setFirstDate: function(date) {
			if (date) {
				this._firstDate = new Date(date);
				this._firstDate.setDate(1);
				this._render();
			}

		},

		/**
		 * 月の最初の日を取得する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date
		 * @param offset 前後の月で設定
		 * @returns 月の最初の日
		 */
		getFirstDate: function(date, offset) {
			var tmpDate = new Date(date);
			// Default is no offset
			offset = offset || 0;

			tmpDate.setMonth(tmpDate.getMonth() + offset);
			tmpDate.setDate(1);

			return tmpDate;
		},

		/**
		 * 選択モードを変更する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param mode
		 */
		setSelectMode: function(mode) {
			var tempDate;

			this.selectMode = mode;
			if (this._selectedDate.length > 0) {
				tempDate = this._selectedDate[this._selectedDate.length - 1];
				this._selectedDate = [];
				this._selectedDate.push(tempDate);
			}
		},

		/**
		 * 選択されている日付を取得する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @returns selectedDates:選択されている日付の配列
		 */
		getSelectedDate: function() {
			var dates = [];
			if (this._selectedDate.length != 0) {
				switch (this.selectMode) {
				case 'single':
					dates.push(this._selectedDate[0]);
					break;
				case 'continue':
					if (this._selectedDate.length == 1) {
						dates.push(this._selectedDate[0]);
					} else {
						// pre-selected date > after-selected dateのチェック
						var start = (this
								._compareDate(this._selectedDate[0], this._selectedDate[1]) != 2) ? new Date(
								this._selectedDate[0])
								: new Date(this._selectedDate[1]);
						//
						var end = (this._compareDate(this._selectedDate[0], this._selectedDate[1]) != 1) ? new Date(
								this._selectedDate[0])

								: new Date(this._selectedDate[1]);
						while (start.getTime() <= end.getTime()) {
							dates.push(new Date(start));
							start = new Date(start.setDate(start.getDate() + 1));
						}
					}
					break;
				case 'multi':
					dates = this._selectedDate;
					break;
				default:
					break;
				}
			}
			return dates;
		},

		/**
		 * 選択できない日付を指定する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param dates
		 */
		setUnselectedDate: function(dates) {
			var dateTime;
			if (dates == undefined) {
				this._unselectableDates = [];
			} else {
				for ( var i = 0; i < dates.length; i++) {
					dateTime = dates[i].getTime();
					if ($.inArray(dateTime, this._unselectableDates) == -1) {
						this._unselectableDates.push(dateTime);
					}
				}
			}

			this._render();
		},

		/**
		 * Cssで、日付がスタイルをカスタマイズする。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param dates
		 * @param className
		 */
		setCssClass: function(dates, className) {
			var specDate = {};
			for ( var i = 0; i < dates.length; i++) {
				var date = dates[i];
				if (className == 'default') {
					if (this._specialDates.hasOwnProperty(date)) {
						specDate = this._specialDates[date];
						if (specDate.hasOwnProperty('cssClass')) {
							delete specDate['cssClass'];
						}
						if (this._getSizeOfObject(specDate) == 0) {
							delete this._specialDates[date];
						}
					}
				} else {
					if (this._specialDates.hasOwnProperty(date)) {
						specDate = this._specialDates[date];
						specDate['cssClass'] = className;
					} else {
						this._specialDates[date] = {
							cssClass: className
						};
					}
				}
			}

			this._render();
		},

		/**
		 * Cssで、週間の日がスタイルをカスタマイズする。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param dow
		 * @param className
		 */
		setCssClassForDow: function(dow, className) {
			if (className == 'default') {
				if (this._userCssDow.hasOwnProperty(dow)) {
					delete this._userCssDow[dow];
				}
			} else {
				this._userCssDow[dow] = className;
			}
			this._render();
		},

		/**
		 * 日付にマーカー（●）を追加する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date
		 * @param isMark
		 */
		setMarker: function(date, isMark) {
			var specDate = {};

			if (!isMark) {
				if (this._specialDates.hasOwnProperty(date)) {
					specDate = this._specialDates[date];
					if (specDate.hasOwnProperty('isMark')) {
						delete specDate['isMark'];
					}
					if (this._getSizeOfObject(specDate) == 0) {
						delete this._specialDates[date];
					}
				}
			} else {
				if (this._specialDates.hasOwnProperty(date)) {
					specDate = this._specialDates[date];
					specDate['isMark'] = isMark;
				} else {
					this._specialDates[date] = {
						isMark: isMark
					};
				}
			}

			this._render();
		},

		/**
		 * 日付にテキスト（表示とか、ツールチップとか、のため）を追加する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date
		 * @param text
		 */
		setText: function(date, text) {
			var specDate = {};

			if (text == '') {
				if (this._specialDates.hasOwnProperty(date)) {
					specDate = this._specialDates[date];
					if (specDate.hasOwnProperty('data')) {
						delete specDate['data'];
					}
					if (this._getSizeOfObject(specDate) == 0) {
						delete this._specialDates[date];
					}
				}
			} else {
				if (this._specialDates.hasOwnProperty(date)) {
					specDate = this._specialDates[date];
					specDate['data'] = text;
				} else {
					this._specialDates[date] = {
						data: text
					};
				}
			}

			this._render();
		},

		/**
		 * ビューモードの変更；特定の月又は、複数の月を表示する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param count
		 */
		setViewMode: function(count) {
		//			this._monthCount = count;
		//			this._render();
		},

		/**
		 * オブジェクトで、属性の数を取得
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param obj
		 * @returns {Number}
		 */
		_getSizeOfObject: function(obj) {
			var size = 0;
			for ( var h in obj) {
				if (obj.hasOwnProperty(h)) {
					size++;
				}
			}
			return size;
		}
	};

	// =========================================================================
	//
	// 外部公開
	//
	// =========================================================================

	h5.core.expose(calendarController);
})(jQuery);