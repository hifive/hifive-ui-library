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
(function($) {

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
	var DOW_NAME = ['日', '月', '火', '水', '木', '金', '土'];

	// 月名
	var MON_NAME = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];


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
		DOW_NAME_CLASSES: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],

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
		_selectedDates: [],

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
		 * @instance
		 * @memberOf h5.ui.components.Calendar
		 * @type Date
		 */
		todayDate: new Date(),

		/**
		 * ←と→のアイコン（全前の月の移動用）
		 *
		 * @instance
		 * @memberOf h5.ui.components.Calendar
		 * @type Date
		 */
		prevArrow: '\u25c4',
		nextArrow: '\u25ba',

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
		 * 特別の日
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @type Map (キー：日付、値：Object{CssClass、isMarker、tooltip-text})
		 */
		_specialDateMap: {},

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
			var root = this._root = $(this.rootElement);
			this.todayDate.setHours(0, 0, 0, 0);
			this.selectMode = 'single';

			// 既定のサイズを設定する
			root.addClass('calendar');

			// 全ての要素のClass
			this._coreCssClass = 'core border ';

			this._option = {
				maxRow: 6,
				maxCol: 7,
				borderSize: 1,
				cellWidth: 0,
				cellHeight: 0
			};
			var containerWidth = root[0].offsetWidth;
			var containerHeight = containerWidth;

			// カレンダーのCSSに基づいて、日のCellのサイズを計測する
			this._option.cellWidth = this._getCellSize(containerWidth, this._option.maxCol);
			this._option.cellHeight = this._getCellSize(containerHeight, this._option.maxRow + 2);
			this._option.width = containerWidth;
			this._option.height = containerHeight;

			// 選択されている月の最初の日
			this._firstDate = new Date(this.todayDate);
			this._firstDate.setDate(1);

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
			starttime = (new Date()).getTime();

			var root = this._root;
			root.children().remove();
			var defaultGroup = this._renderMonth(this._firstDate);
			defaultGroup.attr('id', root.attr('id') + '_calendar_group0');
			root.append(defaultGroup);
			for (var i = 1; i < this._monthCount; i++) {
				var group = this._renderMonth(this._getFirstDayOfMonth(this._firstDate, i));
				group.attr('id', root.attr('id') + '_calendar_group' + i);
				root.append(group);
			}

			endtime = (new Date()).getTime();
			console.log('_render() Function execute in ' + (endtime - starttime) + 'ms');
		},

		/**
		 * 日に基づいて、月のカレンダーを生成する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param firstDate
		 * @returns UI要素
		 */
		_renderMonth: function(firstDate) {
			var option = this._option;

			// 既定のカレンダー
			var $group = $('<table />').data('is', true);

			// タイトルを生成する。
			var $title = this._createTitleBar(firstDate);
			$group.append($title);

			// カレンダーで、最初の日を取得する（先月の日）
			var startDate = new Date(firstDate);
			var startOffset = startDate.getDay();
			if (startOffset == 0) {
				startDate.setDate(startDate.getDate() - 7);
			} else {
				startDate.setDate(startDate.getDate() - startOffset);
			}

			// Add all the cells to the calendar
			for (var row = 0, cellIndex = 0; row < option.maxRow + 1; row++) {
				var $rowLine = $('<tr/>');
				for (var col = 0; col < option.maxCol; col++, cellIndex++) {
					var cellDate = new Date(startDate);
					var cellClass = 'day';
					var $cell = $('<td/>');

					// row = Oの場合、週間の日付
					if (!row) {
						cellClass = 'dow';
						$cell.html(DOW_NAME[col]);
						cellDate = null;

						// Assign other properties to the cell
						$cell.addClass(this._coreCssClass + cellClass);
						$cell.css({
							height: option.cellHeight,
							lineHeight: option.cellHeight + 'px',
							borderTopWidth: option.borderSize,
							borderBottomWidth: option.borderSize,
							borderLeftWidth: (row > 0 || (!row && !col)) ? option.borderSize : 0,
							borderRightWidth: (row > 0 || (!row && col == 6)) ? option.borderSize
									: 0
						});
					} else {
						var specialData = '';
						// Get the new date for this cell
						cellDate.setDate(cellDate.getDate() + col + ((row - 1) * option.maxCol));
						cellClass = this._createCellClass(cellDate, firstDate);
						$cell.html(cellDate.getDate());

						// 特別の日のハンドル
						if (this._specialDateMap.hasOwnProperty(cellDate)) {
							var date = this._specialDateMap[cellDate];
							for ( var i in date) {
								if (i == 'isMark') {
									if (date['isMark']) {
										$cell.append("<br/>●");
									}
								} else if (i == 'data') {
									if (date['data'] != '') {
										specialData = date['data'];
									}
								}
							}
						}

						// Assign other properties to the cell
						$cell.data('data', {
							date: cellDate,
							data: specialData
						}).addClass(this._coreCssClass + cellClass).css({
							width: option.cellWidth,
							height: option.cellHeight,
							lineHeight: option.cellHeight / 3 + 'px',
							borderWidth: option.borderSize
						});
					}

					// Add cell to calendar
					$rowLine.append($cell);
				}
				$group.append($rowLine);
			}
			return $group;
		},

		/**
		 * 日付を基に、セルのCSSクラスを作成する。
		 *
		 * @param cellDate 日付
		 * @param firstDate 表示中の最初の日
		 * @returns String CSSクラス
		 */
		_createCellClass: function(cellDate, firstDate) {
			var cellDateTime = cellDate.getTime();

			// 日付と曜日のclassを追加する。
			var classDow = this.DOW_NAME_CLASSES[cellDate.getDay()];
			var cellClass = 'day ' + classDow;

			// 選択できないデートのハンドル
			if ($.inArray(cellDate.getTime(), this._unselectableDates) != -1) {
				cellClass += ' noday';
			} else {
				// 先月の日のハンドル
				if (firstDate.getMonth() != cellDate.getMonth()) {
					cellClass += ' outday';
				}

				// 選択したデートのハンドル
				if (this._isSelectedDateTime(cellDateTime)) {
					cellClass += ' selected';
				}

				// 今日のハンドル
				if (this.todayDate.getTime() == cellDateTime) {
					cellClass += ' today';
				}

				// 特別の日のハンドル
				if (this._specialDateMap.hasOwnProperty(cellDate)) {
					var date = this._specialDateMap[cellDate];
					if (date['cssClass'] && date['cssClass'] != 'default') {
						cellClass += ' ' + date['cssClass'];
					}
				}

				if (this._userCssDow.hasOwnProperty(classDow)) {
					cellClass += ' ' + this._userCssDow[classDow];
				}
			}
			return cellClass;
		},

		/**
		 * カレンダーのタイトルを生成する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param firstDate
		 * @param option Use for setting CSS
		 * @returns Dom要素
		 */
		_createTitleBar: function(firstDate) {
			var that = this;
			// 前後の月の最初日を取得する
			var prevFirstDate = this._getFirstDayOfMonth(firstDate, -1);
			var nextFirstDate = this._getFirstDayOfMonth(firstDate, 1);

			// Gather flags for prev/next arrows
			var showPrev = (this._compareDate(firstDate, this._firstDate) == 0);
			var lastMonthDate = this._getFirstDayOfMonth(this._firstDate, this._monthCount - 1);
			var showNext = (this._compareDate(firstDate, lastMonthDate) == 0);

			var monyearClass = this._coreCssClass + 'monyear ';
			var $title = $('<tr/>').css({
				height: this._option.cellHeight,
				lineHeight: this._option.cellHeight + 'px',
				borderWidth: this._option.borderSize
			});
			$title.addClass(this._coreCssClass);

			// Create the arrows and title
			var $prevCell = $('<td/>').addClass(monyearClass + 'prev-arrow ');
			$prevCell.append(
					$('<a/>').addClass('prev-arrow' + (showPrev ? '' : '-off'))
							.html(this.prevArrow)).mousedown(function() {
				return false;
			}).click(function(e) {
				if (showPrev) {
					e.stopPropagation();
					that._setFirstDate(prevFirstDate);
				}
			});

			var $titleCell = $('<td colspan="5"/>').addClass(monyearClass + 'title');
			var firstDateMonth = firstDate.getMonth();
			var $monthText = $('<span/>').html(MON_NAME[firstDateMonth]);
			var $yearText = $('<span/>').html(firstDate.getFullYear());
			var $titleYearMonth = $('<div/>').append($monthText).append($yearText);
			$titleCell.append($titleYearMonth);

			var $nextCell = $('<td/>').addClass(monyearClass + 'next-arrow ');
			$nextCell.append(
					$('<a/>').addClass('next-arrow' + (showNext ? '' : '-off'))
							.html(this.nextArrow)).mousedown(function() {
				return false;
			}).click(function(e) {
				if (showNext) {
					e.stopPropagation();
					that._setFirstDate(nextFirstDate);
				}
			});

			// Add cells for prev/title/next
			$title.append($prevCell).append($titleCell).append($nextCell);
			return $title;
		},

		/**
		 * 表示中の月のカレンダーを更新する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param firstDate
		 * @returns UI要素
		 */
		_updateCalendar: function() {
			//For all class .day for update option
			var $dateDOMs = this.$find('.day');
			for (var cnt = 0; cnt < $dateDOMs.length; cnt++) {
				var $cell = $($dateDOMs[cnt]);

				// Get value for this date
				var cellDate = $cell.data('data').date;
				var cellClass = this._createCellClass(cellDate, this._firstDate);

				var html = $cell.html();
				var isMarker = (html.split('●').length > 1);
				var specialData = $cell.data('data').data;
				var isToolTip = (specialData != '');

				// 特別の日のハンドル
				if (this._specialDateMap.hasOwnProperty(cellDate)) {
					var date = this._specialDateMap[cellDate];
					for ( var i in date) {
						if (i == 'isMark') {
							if (!isMarker && date['isMark']) {
								$cell.html(cellDate.getDate() + "<br/>●");
							}
							if (isMarker && !date['isMark']) {
								$cell.html(cellDate.getDate());
							}
						} else if (i == 'data') {
							if (specialData != date['data']) {
								$cell.data('data').data = date['data'];
							}
						}
					}
				} else {
					if (isMarker) {
						$cell.html(cellDate.getDate());
					}
					if (isToolTip) {
						$cell.data('data').data = '';
					}
				}

				var classAttr = $cell.attr('class');
				cellClass = this._coreCssClass + cellClass;
				if (classAttr != cellClass) {
					$cell.removeClass();
					$cell.addClass(this._coreCssClass + cellClass);
				}
			}
		},

		/**
		 * カレンダーで日付をクリックする処理（日付選択）
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param context
		 * @param el（クリックされた要素）
		 */
		'.day click': function(context, el) {
			context.event.stopPropagation();
			// Get the data from this cell
			var clickedData = $(el).data('data');
			this.select(clickedData.date);
		},

		/**
		 * カレンダーでマウスオーバーしたときの処理（ツールチップ表示）
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param context
		 * @param el
		 */
		'.day mouseover': function(context, el) {
			context.event.stopPropagation();
			var clickedData = $(el).data('data');
			var text = clickedData.data;
			if (text) {
				$(el).append(
						'<div class="tooltips" style="top:' + this._option.cellHeight + 'px">'
								+ text + '</div>');
			}
		},

		/**
		 * カレンダーでマウスアウトしたときの処理（ツールチップ削除）
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param context
		 * @param el（クリックされた要素）
		 */
		'.day mouseout': function(context, el) {
			context.event.stopPropagation();
			$(el).find(".tooltips").remove();
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
			return ((_size - 2) / _count);
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
			if (date1.getTime() < date2.getTime()) {
				return -1;
			}

			if (date1.getTime() > date2.getTime()) {
				return 1;
			}

			return 0;
		},

		/**
		 * 選択されていた日付を変更する
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date
		 */
		select: function(date) {
			// Get the data from this cell
			var dateTime = date.getTime();

			if ($.inArray(dateTime, this._unselectableDates) == -1) {
				var index = $.inArray(dateTime, this._selectedDates);
				if (index == -1) {
					switch (this.selectMode) {
					case 'single':
						this._selectedDates[0] = dateTime;
						break;
					case 'continue':
						if (this._selectedDates.length <= 1) {
							this._selectedDates.push(dateTime);
						} else {
							this._selectedDates[0] = this._selectedDates[1];
							this._selectedDates[1] = dateTime;
						}
						break;
					case 'multi':
						this._selectedDates.push(dateTime);
						break;
					}
				} else {
					this._selectedDates.splice(index, 1);
				}
				if (date.getMonth() == this._firstDate.getMonth()) {
					this._updateCalendar();
				} else {
					this._setFirstDate(date);
				}
			}
		},

		unselect: function(date) {
			var dateTime = date.getTime();
			var index = $.inArray(dateTime, this._selectedDates);
			if (index != -1) {
				this._selectedDates.splice(index, 1);
			}
			this._updateCalendar();
		},

		/**
		 * 表示中の月に、最初の日を設定する。表示中のカレンダーを変更する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date
		 */
		_setFirstDate: function(date) {
			this._firstDate = new Date(date);
			this._firstDate.setDate(1);
			this._render();
		},

		/**
		 * 月の最初の日を取得する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date
		 * @param offset 前後の月で設定
		 * @returns 月の最初の日
		 */
		_getFirstDayOfMonth: function(date, offset) {
			var tmpDate = new Date(date);
			// Default is no offset
			offset = offset || 0;

			tmpDate.setMonth(tmpDate.getMonth() + offset);
			tmpDate.setDate(1);

			return tmpDate;
		},

		/**
		 * 任意の年を設定する
		 *
		 * @param year
		 */
		setYear: function(year) {
			var date = new Date(year, this._firstDate.getMonth(), 1);
			this._setFirstDate(date);
		},

		/**
		 * 任意の月を設定する
		 *
		 * @param month
		 */
		setMonth: function(month) {
			var date = new Date(this._firstDate.getFullYear(), month, 1);
			this._setFirstDate(date);
		},

		setCalendar: function(year, month) {
			var date = new Date(year, month, 1);
			this._setFirstDate(date);
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
			if (this._selectedDates.length > 0) {
				tempDate = this._selectedDates[this._selectedDates.length - 1];
				this._selectedDates = [];
				this._selectedDates.push(tempDate);
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
			if (this._selectedDates.length != 0) {
				switch (this.selectMode) {
				case 'single':
					dates.push(new Date(this._selectedDates[0]));
					break;
				case 'continue':
					if (this._selectedDates.length == 1) {
						dates.push(new Date(this._selectedDates[0]));
					} else {
						var start = new Date(this._selectedDates[0]);
						var end = new Date(this._selectedDates[1]);
						//startSelectedDate > endSelectedDateの場合
						if (this._compareDate(start, end) == 1) {
							start = new Date(this._selectedDates[1]);
							end = new Date(this._selectedDates[0]);
						}

						while (start.getTime() <= end.getTime()) {
							dates.push(new Date(start));
							start = new Date(start.setDate(start.getDate() + 1));
						}
					}
					break;
				case 'multi':
					for (var i = 0; i < this._selectedDates.length; i++) {
						dates.push(new Date(this._selectedDates[i]));
					}
					break;
				default:
					break;
				}
			}

			for (var i = 0; i < dates.length; i++) {
				var datetime = dates[i].getTime();
				if ($.inArray(datetime, this._unselectableDates) != -1) {
					dates.splice(i, 1);
				}
			}
			return dates;
		},

		_isSelectedDateTime: function(dateTime) {
			if ($.inArray(dateTime, this._unselectableDates) != -1) {
				return false;
			}

			if (this._selectedDates.length != 0) {
				switch (this.selectMode) {
				case 'single':
					return (this._selectedDates[0] == dateTime);
					break;
				case 'continue':
					if (this._selectedDates.length == 1) {
						return (this._selectedDates[0] == dateTime);
					} else {
						var start = this._selectedDates[0];
						var end = this._selectedDates[1];
						//startSelectedDate > endSelectedDateの場合
						if (start > end) {
							start = this._selectedDates[1];
							end = this._selectedDates[0];
						}

						if (start <= dateTime && dateTime <= end) {
							return true;
						}
					}
					break;
				case 'multi':
					return ($.inArray(dateTime, this._selectedDates) != -1);
					break;
				default:
					break;
				}
			}

			return false;
		},

		/**
		 * 選択できない日付を指定する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param dates
		 */
		setSelectable: function(dates, isSelectable) {
			var dateTime;
			if (dates == undefined) {
				this._unselectableDates = [];
			} else {
				for (var i = 0; i < dates.length; i++) {
					dateTime = dates[i].getTime();
					var index = $.inArray(dateTime, this._unselectableDates);
					if (!isSelectable) {
						if (index == -1) {
							this._unselectableDates.push(dateTime);
							var selectIndex = $.inArray(dateTime, this._selectedDates);
							if (selectIndex != -1) {
								this._selectedDates.splice(selectIndex, 1);
							}
						}
					} else {
						if (index != -1) {
							this._unselectableDates.splice(index, 1);
						}
					}
				}
			}

			this._updateCalendar();
		},

		isSelectable: function(date) {
			return ($.inArray(date.getTime(), this._unselectableDates) == -1);
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
			for (var i = 0; i < dates.length; i++) {
				var date = dates[i];
				if (className == 'default') {
					if (this._specialDateMap.hasOwnProperty(date)) {
						specDate = this._specialDateMap[date];
						if (specDate.hasOwnProperty('cssClass')) {
							delete specDate['cssClass'];
						}
						if (this._getSizeOfObject(specDate) == 0) {
							delete this._specialDateMap[date];
						}
					}
				} else {
					if (this._specialDateMap.hasOwnProperty(date)) {
						specDate = this._specialDateMap[date];
						specDate['cssClass'] = className;
					} else {
						this._specialDateMap[date] = {
							cssClass: className
						};
					}
				}
			}

			this._updateCalendar();
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
			this._updateCalendar();
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
				if (this._specialDateMap.hasOwnProperty(date)) {
					specDate = this._specialDateMap[date];
					if (specDate.hasOwnProperty('isMark')) {
						delete specDate['isMark'];
					}
					if (this._getSizeOfObject(specDate) == 0) {
						delete this._specialDateMap[date];
					}
				}
			} else {
				if (this._specialDateMap.hasOwnProperty(date)) {
					specDate = this._specialDateMap[date];
					specDate['isMark'] = isMark;
				} else {
					this._specialDateMap[date] = {
						isMark: isMark
					};
				}
			}

			this._updateCalendar();
		},

		/**
		 * 日付にテキスト（表示とか、ツールチップとか、のため）を追加する。
		 *
		 * @memberOf h5.ui.components.Calendar
		 * @param date
		 * @param text
		 */
		setTooltip: function(date, text) {
			var specDate = {};

			if (text == '') {
				if (this._specialDateMap.hasOwnProperty(date)) {
					specDate = this._specialDateMap[date];
					if (specDate.hasOwnProperty('data')) {
						delete specDate['data'];
					}
					if (this._getSizeOfObject(specDate) == 0) {
						delete this._specialDateMap[date];
					}
				}
			} else {
				if (this._specialDateMap.hasOwnProperty(date)) {
					specDate = this._specialDateMap[date];
					specDate['data'] = text;
				} else {
					this._specialDateMap[date] = {
						data: text
					};
				}
			}

			this._updateCalendar();
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