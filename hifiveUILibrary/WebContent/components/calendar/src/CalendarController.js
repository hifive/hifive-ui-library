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
$(function() {

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
		 * @instance
		 * @memberOf h5.ui.components.Calendar
		 * @type String
		 */
		__name: 'h5.ui.components.Calendar',

		/**
		 * DOMカレンダー要素のID
		 *
		 * @instance
		 * @memberOf h5.ui.components.Calendar
		 * @type String
		 */
		id: null,

		/**
		 * カレンダーを添付される要素
		 *
		 * @instance
		 * @memberOf h5.ui.components.Calendar
		 * @type
		 */
		_root: null,

		_zIndex: 1000,

		// カレンダーでの選択方
		// ３種類あります。
		// 'single':特定の1日を選択する, 'continue':連続する日, 'multi':任意の日を複数指定できる。
		selectMode: null,

		// 選択した日付
		_selectedDate: [],

		// １ヶ月の最初の日
		_firstDate: null,

		// 今日
		todayDate: new Date(),

		// 全前の月を移動するためにのアイコン
		prevArrow: '\u25c4',
		nextArrow: '\u25ba',

		// カレンダーのサイズ
		size: null,

		// カレンダーのスタイル


		userCssName: null,

		// 選択できない日付
		_unselectableDates: [],

		// 週間の日によって、Cssでカスタマイズするマップ。
		_userCssDow: {},

		// 特別の日付
		// 属性が３つあります。
		// 'cssClass'：Cssでカスタマイズされるクラス名、 'isMark'：マーカー日、 'text':ツールチップのテキスト
		_specialDates: {},

		// ビューモード
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
			this.size = 600;
			this.userCssName = 'default ';
			this.todayDate.setHours(0, 0, 0, 0);
			this.selectMode = 'single';

			// 選択されている日付
			//			if (this._selectedDate.length == 0) {
			//				if (typeof context.evArg == 'undefined') {
			//					this._selectedDate.push(this.todayDate);
			//				} else {
			//					this._selectedDate.push(context.evArg.selectedDate);
			//				}
			//			}

			// 選択されている月の最初の日
			this._firstDate = new Date(this.todayDate);
			this._firstDate.setDate(1);

			//Gen calendar Id
			this.id = 'calendar_' + Math.round(Math.random() * 1e10);

			// render with user-defined size and default CSS
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
			var calendar = null;
			if ($('#' + this.id).length == 0) {
				calendar = $('<div/>').attr('id', this.id).data('is', true).css({
					zIndex: this._zIndex,
				//width: (cellWidth * maxCol) + 'px'
				});

				root.append(calendar);
			} else {
				calendar = $('#' + this.id);
			}
			$(calendar).addClass('calendar').children().remove();

			var defaultGroup = this._renderMonth(this._firstDate);
			$(calendar).append(defaultGroup);
			for ( var i = 1; i < this._monthCount; i++) {
				var group = this._renderMonth(this.getFirstDate(this._firstDate, i));
				$(calendar).append(group);
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

			// 全ての要素のClass
			var coreClass = ' core border ';

			// 定数
			var maxRow = 6;
			var maxCol = 7;
			var borderSize = 1;

			// 日と月名の配列
			var dowNames = ['日', '月', '火', '水', '木', '金', '土'];
			var dowNameClasses = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
			var monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月',
					'12月'];

			// カレンダーのサイズ
			var containerWidth = this.size;
			var containerHeight = this.size;

			// カレンダーのサイズに基づいて、日のCellのサイズを計測する
			var cellWidth = this._getCellSize(containerWidth, maxCol);
			var cellHeight = this._getCellSize(containerHeight, maxRow + 2);

			var group1 = $('<div/>').data('is', true).css({
				zIndex: this._zIndex,
				width: (cellWidth * maxCol) + 'px'
			});


			// CellのCSSを定義する
			var cellTitleCSS = {
				width: cellWidth + 'px',
				height: cellHeight + 'px',
				lineHeight: cellHeight + 'px'
			};

			// 前後の月の最初日を取得する
			var prevFirstDate = this.getFirstDate(firstDate, -1);
			var nextFirstDate = this.getFirstDate(firstDate, 1);

			// カレンダーで、最初の日を取得する（先月の日）
			var startDate = new Date(firstDate);
			var startOffset = startDate.getDay();
			if (startOffset == 0) {
				startDate.setDate(startDate.getDate() - 7);
			} else {
				startDate.setDate(startDate.getDate() - startOffset);
			}

			// Gather flags for prev/next arrows
			var showPrev = (firstDate.getTime() == this._firstDate.getTime());
			var lastMonthDate = this.getFirstDate(this._firstDate, this._monthCount - 1);
			var showNext = (firstDate.getTime() == lastMonthDate.getTime());

			// Create the arrows and title
			var monyearClass = coreClass + 'monyear ';
			var prevCell = $('<div/>').addClass(monyearClass).css($.extend({}, cellTitleCSS, {
				borderWidth: borderSize + 'px 0 0 ' + borderSize + 'px',
				float: 'left'
			})).append(
					$('<a/>').addClass('prev-arrow' + (showPrev ? '' : '-off'))
							.html(this.prevArrow)).mousedown(function() {
				return false;
			}).click(function(e) {
				if (this.prevArrow != '' && showPrev) {
					e.stopPropagation();
					that.setFirstDate(prevFirstDate);
				}
			});

			var titleCellCount = maxCol - 2;
			var titleWidth = (cellWidth * titleCellCount);
			var titleCell = $('<div/>').addClass(monyearClass + 'title').css(
					$.extend({}, cellTitleCSS, {
						width: titleWidth + 'px',
						borderTopWidth: borderSize,
						float: 'left'
					}));

			var nextCell = $('<div/>').addClass(monyearClass).css($.extend({}, cellTitleCSS, {
				borderWidth: borderSize + 'px ' + borderSize + 'px 0 0',
				float: 'left'
			})).append(
					$('<a/>').addClass('next-arrow' + (showNext ? '' : '-off'))
							.html(this.nextArrow)).mousedown(function() {
				return false;
			}).click(function(e) {
				if (this.nextArrow != '' && showNext) {
					e.stopPropagation();
					that.setFirstDate(nextFirstDate);
				}
			});

			// Add cells for prev/title/next
			group1.append(prevCell).append(titleCell).append(nextCell);

			var calendarData = $('<table />');
			// Add all the cells to the calendar
			var firstDateMonth = firstDate.getMonth();
			var firstDateYear = firstDate.getFullYear();
			for ( var row = 0, cellIndex = 0; row < maxRow + 1; row++) {
				var rowLine = $('<tr/>');
				for ( var col = 0; col < maxCol; col++, cellIndex++) {
					var cellDate = new Date(startDate);
					var cellClass = 'day';
					var cellZIndex = this._zIndex + (cellIndex);
					var cell = $('<td/>');

					// row = Oの場合、週間の日付
					if (!row) {
						cellClass = 'dow';
						cell.html(dowNames[col]);
						cellDate = null;

						// Update the css for the cell
						$.extend(cellTitleCSS, {
							borderTopWidth: borderSize,
							borderBottomWidth: borderSize,
							borderLeftWidth: (row > 0 || (!row && !col)) ? borderSize : 0,
							borderRightWidth: (row > 0 || (!row && col == 6)) ? borderSize : 0,
						// zIndex: cellZIndex
						});
						// Assign other properties to the cell
						cell.addClass(coreClass + cellClass).css(cellTitleCSS);
					} else {
						var specialData = '';
						// Get the new date for this cell
						cellDate.setDate(cellDate.getDate() + col + ((row - 1) * maxCol));
						cellDate.setHours(0, 0, 0, 0);

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
							if (firstDateMonth != cellDate.getMonth()) {
								cellClass += ' outday';
							}
							// 今日のハンドル
							if (this.todayDate.getTime() == cellDateTime) {
								cellClass += ' today';
								cellZIndex += 50;
							}
							// 選択したデートのハンドル
							switch (that.selectMode) {
							case 'continue':
								var start = this._selectedDate[0] || 0;
								var end = this._selectedDate[1] || 0;

								if (start == 0) {
									alert("Logic Error!");
									return;
								} else {
									if (start.getTime() == cellDateTime) {
										cellClass += ' selected';
										cellZIndex += 51;
									}

									if (end == 0) {
										break;
									}

									var temp = null;
									if (start > end) {
										temp = end;
										end = start;
										start = temp;
									}

									if (start.getTime() <= cellDateTime
											&& cellDateTime <= end.getTime()) {
										cellClass += ' selected';
										cellZIndex += 51;
									}
								}
								break;
							case 'multi':
								for ( var i = 0; i < this._selectedDate.length; i++) {
									if (this._selectedDate[i].getTime() == cellDateTime) {
										cellClass += ' selected';
										cellZIndex += 51;
										break;
									}
								}

								break;
							default:
								if (this._selectedDate.length > 0
										&& this._selectedDate[0].getTime() == cellDateTime) {
									cellClass += ' selected';
									cellZIndex += 51;
								}
								break;
							}

							// 特別の日のハンドル
							if (this._specialDates.hasOwnProperty(cellDate)) {
								cellZIndex += 53;
								var date = this._specialDates[cellDate];
								for ( var i in date) {
									switch (i) {
									case 'isMark':
										if (date['isMark']) {
											cell.append("<br/>●");
										}
										break;
									case 'data':
										if (date['data'] != '') {
											specialData = date['data'];
										}
										break;
									case 'cssClass':
										if (date['cssClass'] != 'default') {
											cellClass += ' ' + date['cssClass'];
											cellZIndex += 53;
										}
										break;
									}
								}
							}

							if (this._userCssDow.hasOwnProperty(classDow)) {
								cellClass += ' ' + this._userCssDow[classDow];
								cellZIndex += 54;
							}

							cell.mouseover(
									function() {
										var clickedData = $(this).data('data');
										var text;
										if (clickedData.data) {
											text = clickedData.data;
											$(this)
													.append(
															'<div class="tooltips" style="top:'
																	+ cellHeight + 'px">' + text
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

									if (that._selectedDate.length == 1) {
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
								;

								// that._selectedDate[0] = clickedData.date;
								that._firstDate = new Date(clickedData.date);
								that._firstDate.setDate(1);

								that._render();
								that.trigger('syncWithCalendar', {
									date: clickedData.date
								});
							});
						}

						// Assign other properties to the cell
						cell.data('data', {
							date: cellDate,
							data: specialData
						}).addClass(coreClass + cellClass).css({
							width: cellWidth + 'px',
							height: cellHeight + 'px',
							lineHeight: cellHeight / 3 + 'px',
							borderWidth: borderSize,
						// zIndex: cellZIndex

						});
					}

					// Add cell to calendar
					rowLine.append(cell);
				}
				calendarData.append(rowLine);
			}
			group1.append(calendarData);

			// Render the month / year title
			var monthText = $('<span/>').html(monthNames[firstDateMonth]);
			var yearText = $('<span/>').html(firstDateYear);
			var titleYearMonth = $('<div/>').append(monthText).append(yearText);

			// Add to title
			titleCell.children().remove();
			titleCell.append(titleYearMonth);

			return group1;

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
			switch (this.selectMode) {
			case 'single':
				dates.push(this._selectedDate[0]);
				break;
			case 'continue':
				var start = (this._selectedDate[0].getTime() <= this._selectedDate[1]) ? new Date(
						this._selectedDate[0]) : new Date(this._selectedDate[1]);
				var end = (this._selectedDate[0].getTime() > this._selectedDate[1]) ? new Date(
						this._selectedDate[0]) : new Date(this._selectedDate[1]);
				while (start.getTime() <= end.getTime()) {
					dates.push(new Date(start));
					start = new Date(start.setDate(start.getDate() + 1));
				}
				break;
			case 'multi':
				dates = this._selectedDate;
				break;
			default:
				break;
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

	h5.core.expose(calendarController);
});