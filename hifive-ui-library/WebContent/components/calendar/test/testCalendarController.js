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

	module('Calenderコントローラ', {
		setup: function() {
			// setupは各テストの最初に実行される関数
			// stop(), start(), を使って非同期にできる

			stop(); // コントローラのバインドが終わるまで待ってほしいので、stop()で止める

			// thisは、ここのsetupを定義しているオブジェクトを指し、this.xxx に登録すると各テストケースで参照できる
			this.controller = h5.core.controller('#container', h5.ui.components.Calendar);

			this.controller.readyPromise.done(function() {
				// コントローラのバインドが終わったらstart();
				start();
			});
		},
		teardown: function() {
			// 各テストケースが終わったらdispose();
			this.controller.dispose();
			$('#container').children().remove();
		},
		controller: null,

		monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
	});

	// コントローラのバインドはsetupで行っているので、各テストケースでは非同期にする必要がない。
	test("select()関数：日付選択", function() {
		var testDate = new Date(2012, 11, 11);
		this.controller.select(testDate);

		var selectedDate = $('.selected');
		var actualDay = selectedDate.html();
		var actualMonth = $('.monyear >div> span').get(0).innerHTML;
		actualMonth = $.inArray(actualMonth, this.monthNames);
		var actualYear = $('.monyear >div> span').get(1).innerHTML;
		var actualDate = new Date(actualYear, actualMonth, actualDay);
		strictEqual(actualDate.getTime(), testDate.getTime(), '1番目の選択：日付を選択すること。');

		this.controller.select(testDate);
		selectedDate = $('.selected');
		equal(selectedDate.length, 0, '2番目の選択：日付の選択状態を解除こと。');
	});

	test("unselect()関数：日付選択の解除", function() {
		var testDate = new Date(2012, 11, 11);
		this.controller.select(testDate);

		var selectedDate = $('.selected');
		var actualDay = selectedDate.html();
		var actualMonth = $('.monyear >div> span').get(0).innerHTML;
		actualMonth = $.inArray(actualMonth, this.monthNames);
		var actualYear = $('.monyear >div> span').get(1).innerHTML;
		var actualDate = new Date(actualYear, actualMonth, actualDay);
		strictEqual(actualDate.getTime(), testDate.getTime(), '日付を選択すること。');

		this.controller.unselect(testDate);
		selectedDate = $('.selected');
		equal(selectedDate.length, 0, '日付の選択状態を解除こと。');
	});

	test("setYear()関数：任意の年の表示", function() {
		this.controller.setYear(1988);

		var actualYear = $('.monyear >div> span').get(1).innerHTML;
		equal(actualYear, 1988, '任意の年を表示すること。');
	});

	test("setMonth()関数：任意の月の表示", function() {
		this.controller.setMonth(1);

		var actualMonth = $('.monyear >div> span').get(0).innerHTML;
		actualMonth = $.inArray(actualMonth, this.monthNames);
		equal(actualMonth, 1, '任意の月を表示すること。');
	});

	test("setCalendar()関数：任意の年月の表示", function() {
		this.controller.setCalendar(1988, 1);

		var actualMonth = $('.monyear >div> span').get(0).innerHTML;
		actualMonth = $.inArray(actualMonth, this.monthNames);
		equal(actualMonth, 1, '任意の月を表示すること。');

		var actualYear = $('.monyear >div> span').get(1).innerHTML;
		equal(actualYear, 1988, '任意の年を表示すること。');
	});

	test("setSelectMode()関数：特定の日", function() {
		// 特定の日もモード
		this.controller.setSelectMode('single');

		// 日付選択
		var testDate = new Date(2013, 10, 27);
		this.controller.select(testDate);

		// DOMで選択されている日付を取得
		var count = $('.selected').length;
		equal(count, 1, "画面で選択されている日の数は１であること。");
		var actualDate = $('.selected').data('data').date;
		strictEqual(actualDate.getTime(), testDate.getTime(), '画面で"'
				+ testDate.toLocaleDateString() + '"は選択されていること。');
	});

	test("setSelectMode()関数：連続する日", function() {
		// 連続する日のモード
		this.controller.setSelectMode('continue');

		// 日付選択
		var testStartDate = new Date(2013, 10, 17);
		this.controller.select(testStartDate);
		var testEndDate = new Date(2013, 10, 26);
		this.controller.select(testEndDate);

		// DOMで選択されている日付を取得
		var count = $('.selected').length;
		equal(count, 10, "画面で選択されている日の数は10であること。");

		var result = true;
		var tempDate = new Date(testStartDate);
		for ( var i = 0; i < $('.selected').length; i++) {
			var actualCell = $('.selected').get(i);
			var actualDate = $(actualCell).data('data').date;
			if (actualDate.getTime() != tempDate.getTime()) {
				result = false;
				break;
			}
			tempDate.setDate(tempDate.getDate() + 1);
			tempDate = new Date(tempDate);
		}
		ok(result, '画面で"' + testStartDate.toLocaleDateString() + '"から、"'
				+ testStartDate.toLocaleDateString() + '"まで日付は選択されていること。');
	});


	test("setSelectMode()関数：複数の日", function() {
		// 複数の日のモード
		this.controller.setSelectMode('multi');

		var testDate1 = new Date(2013, 10, 17);
		this.controller.select(testDate1);
		var testDate2 = new Date(2013, 10, 26);
		this.controller.select(testDate2);

		// DOMで選択されている日付を取得
		var count = $('.selected').length;
		equal(count, 2, "画面で選択されている日の数は2であること。");

		var result = true;
		var dates = [testDate1, testDate2];
		for ( var i = 0; i < dates.length; i++) {
			var actualCell = $('.selected').get(i);
			var actualDate = $(actualCell).data('data').date;
			if (actualDate.getTime() != dates[i].getTime()) {
				result = false;
				break;
			}
		}
		ok(result, '画面で"' + testDate1.toLocaleDateString() + '"と"' + testDate2.toLocaleDateString()
				+ '"は選択されていること。');
	});

	test("setSelectable(false)関数：選択できない状態", function() {
		var testDates = [new Date(2013, 10, 7), new Date(2013, 10, 9), new Date(2013, 10, 17),
				new Date(2013, 10, 24)];
		// 選択できない状態
		this.controller.setSelectable(testDates, false);

		var count = $('.noday').length;
		equal(count, 4, "画面で、選択できない日付は4日間であること。");

		var result = true;
		var msg = '';
		for ( var i = 0; i < count; i++) {
			var actualCell = $('.noday').get(i);
			var actualDate = $(actualCell).data('data').date;
			if (actualDate.getTime() != testDates[i].getTime()) {
				result = false;
				break;
			}
			if (i != count - 1) {
				msg += ' "' + testDates[i].toLocaleDateString() + '"、';
			} else {
				msg += '"' + testDates[i].toLocaleDateString() + '"';
			}
		}
		ok(result, '画面で' + msg + '日付は選択できないこと。');
	});

	asyncTest("setSelectable(true)関数：選択できる状態", function() {
		var that = this;
		var testDates = [new Date(2013, 10, 7), new Date(2013, 10, 9), new Date(2013, 10, 17),
				new Date(2013, 10, 24)];
		// 選択できない状態
		this.controller.setSelectable(testDates, false);

		var count = $('.noday').length;
		equal(count, 4, "setSelectable(false)： 画面で、選択できない日付は4日間であること。");
		var result = true;
		var msg = '';
		for ( var i = 0; i < count; i++) {
			var actualCell = $('.noday').get(i);
			var actualDate = $(actualCell).data('data').date;
			if (actualDate.getTime() != testDates[i].getTime()) {
				result = false;
				break;
			}
			if (i != count - 1) {
				msg += ' "' + testDates[i].toLocaleDateString() + '"、';
			} else {
				msg += '"' + testDates[i].toLocaleDateString() + '"';
			}
		}
		ok(result, 'setSelectable(false)： 画面で' + msg + '日付は選択できないこと。');

		this.controller.select(new Date(2013, 10, 9));
		var numberOfSelectedDate = $('.selected').length;
		equal(numberOfSelectedDate, 0, 'select()関数を使っても、日付で選択できない状態がそのままにおくこと。');

		this.controller.setSelectable([new Date(2013, 10, 9)], true);
		count = $('.noday').length;
		equal(count, 3, "setSelectable(true)： 画面で、選択できない日付は3日間になること。");

		testDates.splice(1, 1);
		var msg = '';
		for ( var i = 0; i < count; i++) {
			var actualCell = $('.noday').get(i);
			var actualDate = $(actualCell).data('data').date;
			if (actualDate.getTime() != testDates[i].getTime()) {
				result = false;
				break;
			}
			if (i != count - 1) {
				msg += ' "' + testDates[i].toLocaleDateString() + '"、';
			} else {
				msg += '"' + testDates[i].toLocaleDateString() + '"';
			}
		}
		ok(result, 'setSelectable(true)： 画面で' + msg + '日付は選択できないこと。');

		setTimeout(function() {
			that.controller.setSelectable();
			count = $('.noday').length;
			equal(count, 0, "setSelectable()： 全ての日を選択できること。");
			start();
		}, 1000);
	});

	test("getSelectedDate()関数：特定の日", function() {
		// Single Mode
		this.controller.setSelectMode('single');

		// 日付選択
		var testDate = new Date(2013, 10, 27);
		this.controller.select(testDate);

		// getSelectedDate
		var actualDate = this.controller.getSelectedDate();
		equal(actualDate.length, 1, "SelectedDate配列が１項目あること。");
		strictEqual(actualDate[0].getTime(), testDate.getTime(), '取得された日付は"'
				+ testDate.toLocaleDateString() + '"であること。');
	});


	test("getSelectedDate()関数：連続する日", function() {
		// 連続する日のモード
		this.controller.setSelectMode('continue');

		// 日付選択
		var testStartDate = new Date(2013, 10, 17);
		this.controller.select(testStartDate);

		var testEndDate = new Date(2013, 11, 2);
		this.controller.select(testEndDate);

		// getSelectedDate
		var actualDates = this.controller.getSelectedDate();
		var result = true;
		equal(actualDates.length, 16, "SelectedDate配列が10項目あること。");
		var tempDate = new Date(testStartDate);
		for ( var i = 0; i < actualDates.length; i++) {
			var actualDate = actualDates[i];
			if (actualDate.getTime() != tempDate.getTime()) {
				result = false;
				break;
			}
			tempDate.setDate(tempDate.getDate() + 1);
			tempDate = new Date(tempDate);
		}
		ok(result, '取得された日付は"' + testStartDate.toLocaleDateString() + '"から、"'
				+ testEndDate.toLocaleDateString() + '"までであること。');

	});

	test("getSelectedDate()関数：複数の日", function() {
		// 複数の日のモード
		this.controller.setSelectMode('multi');

		// 日付選択
		var testDate1 = new Date(2013, 10, 17);
		this.controller.select(testDate1);
		var testDate2 = new Date(2013, 10, 26);
		this.controller.select(testDate2);

		// DOMで選択されている日付を取得
		var actualDates = this.controller.getSelectedDate();
		equal(actualDates.length, 2, "SelectedDate配列が2項目あること。");

		var result = true;
		var dates = [testDate1, testDate2];
		for ( var i = 0; i < dates.length; i++) {
			if (actualDates[i].getTime() != dates[i].getTime()) {
				result = false;
				break;
			}
		}
		ok(result, '取得された日付は"' + testDate1.toLocaleDateString() + '"と"'
				+ testDate2.toLocaleDateString() + '"であること。');
	});

	test("getSelectedDate()関数：選択できない日", function() {
		// 日付選択
		var testDate = new Date(2013, 10, 27);
		this.controller.select(testDate);

		// getSelectedDate
		var actualDate = this.controller.getSelectedDate();
		equal(actualDate.length, 1, "SelectedDate配列が１項目あること。");
		strictEqual(actualDate[0].getTime(), testDate.getTime(), '取得された日付は"'
				+ testDate.toLocaleDateString() + '"であること。');

		// 選択できなくなる
		this.controller.setSelectable([testDate], false);
		actualDate = this.controller.getSelectedDate();
		strictEqual(actualDate.length, 0, '選択できなくなった後：SelectedDate配列が0項目になること。');

		// 選択できるようになる
		this.controller.setSelectable([testDate], true);
		actualDate = this.controller.getSelectedDate();
		strictEqual(actualDate.length, 0, '選択できる状態を戻た後：SelectedDate配列が0項目になること。');
	});

	test("isSelectable()関数", function() {
		var testDate1 = new Date(2013, 10, 27);
		var testDate2 = new Date(2013, 10, 1);
		var testDate3 = new Date(2013, 10, 3);
		this.controller.setSelectable([testDate1, testDate2], false);

		// 選択状態をチェックする
		var result = this.controller.isSelectable(testDate1);
		ok(!result, '"' + testDate1.toLocaleDateString() + '"が選択できないこと。');
		result = this.controller.isSelectable(testDate2);
		ok(!result, '"' + testDate2.toLocaleDateString() + '"が選択できないこと。');
		result = this.controller.isSelectable(testDate3);
		ok(result, '"' + testDate3.toLocaleDateString() + '"が選択できること。');

	});

	asyncTest("setCssClass関数", function() {
		var that = this;
		var testDates = [new Date(2013, 10, 7), new Date(2013, 10, 9), new Date(2013, 10, 17),
				new Date(2013, 10, 24)];
		this.controller.setCssClass(testDates, 'style1');

		var count = $('.style1').length;
		equal(count, 4, "画面で、違いスタイルの日付は4日間であること。");

		var result = true;
		var msg = '';
		for ( var i = 0; i < count; i++) {
			var actualCell = $('.style1').get(i);
			var actualDate = $(actualCell).data('data').date;
			if (actualDate.getTime() != testDates[i].getTime()) {
				result = false;
				break;
			}
			if (i != count - 1) {
				msg += ' "' + testDates[i].toLocaleDateString() + '"、';
			} else {
				msg += '"' + testDates[i].toLocaleDateString() + '"';
			}
		}

		ok(result, '画面で' + msg + '日付はスタイルが変更されること。');

		setTimeout(function() {
			that.controller.setCssClass(testDates, 'default');
			count = $('.style1').length;
			equal(count, 0, "全ての日がスタイルが復元されること。");
			start();
		}, 1000);
	});

	asyncTest("setCssClassForDow関数", function() {
		var that = this;
		this.controller.setCssClassForDow('sun', 'style1');

		var result = true;
		for ( var i = 0; i < $('.sun').length; i++) {
			var actualCell = $('.sun').get(i);
			if (!$(actualCell).hasClass('style1')) {
				result = false;
				break;
			}
		}
		ok(result, '画面で、日曜日はスタイルが変更されること。');

		setTimeout(function() {
			that.controller.setCalendar(1988, 1);
			for ( var i = 0; i < $('.sun').length; i++) {
				var actualCell = $('.sun').get(i);
				if (!$(actualCell).hasClass('style1')) {
					result = false;
					break;
				}
			}
			ok(result, '「1988年2月」に移動した後、日曜日はスタイルも変更されること。');
			start();
		}, 1000);
	});

	asyncTest("setMarker関数", function() {
		var that = this;
		var testDate = new Date(2013, 10, 17);
		this.controller.setMarker(testDate, true);

		var index = getDomOfDate(testDate);
		var content = $('.day').get(index).innerHTML;

		notEqual(content.indexOf('●'), -1, '画面で、"' + testDate.toLocaleDateString()
				+ '"はマーカーされること。');

		setTimeout(function() {
			that.controller.setMarker(testDate, false);
			content = $('.day').get(index).innerHTML;
			equal(content.indexOf('●'), -1, '画面で、"' + testDate.toLocaleDateString()
					+ '"のマーカーが削除されること。');
			start();
		}, 1000);

	});

	test("setTooltip関数", function() {
		var testDate = new Date(2013, 10, 17);
		this.controller.setTooltip(testDate, 'This is ' + testDate.toLocaleDateString());

		var index = getDomOfDate(testDate);
		var cell = $('.day').get(index);
		var text = $(cell).data('data').data;
		$(cell).mouseover();

		strictEqual(text, 'This is ' + testDate.toLocaleDateString(), '"'
				+ testDate.toLocaleDateString() + '"では、文字列が設定されて、ツールチップが表示できること。');
	});

	test("日付のClickイベント", function() {
		var testDate = new Date(2013, 10, 17);
		var index = getDomOfDate(testDate);
		var cell = $('.day').get(index);
		$(cell).trigger('click');

		var result = $(cell).hasClass('selected');
		ok(result, '日付のClickイベントで日付を選択すること。');
	});

	test("日付のmouseoverイベント", function() {
		var testDate = new Date(2013, 10, 17);
		this.controller.setTooltip(testDate, 'This is ' + testDate.toLocaleDateString());
		var index = getDomOfDate(testDate);
		var cell = $('.day').get(index);
		$(cell).trigger('mouseover');

		var result = $(cell).find('.tooltips').length;
		equal(result, 1, '日付のmouseoverイベントで,日付でツールチップが表示されること。');
	});

	asyncTest("日付のmouseoutイベント", function() {
		var testDate = new Date(2013, 10, 17);
		this.controller.setTooltip(testDate, 'This is ' + testDate.toLocaleDateString());
		var index = getDomOfDate(testDate);
		var cell = $('.day').get(index);
		$(cell).trigger('mouseover');
		var result = $(cell).find('.tooltips').length;
		equal(result, 1, '日付のmouseoverイベントで,日付でツールチップが表示されること。');

		setTimeout(function() {
			$(cell).trigger('mouseout');
			result = $(cell).find('.tooltips').length;
			equal(result, 0, '日付のmouseoutイベントで,日付のツールチップが非表示	されること。');
			start();
		}, 1000);

	});

	// 日付に対応するDOM要素を取得する
	function getDomOfDate(date) {
		// カレンダーで、最初の日を取得する（先月の日）
		var firstDate = new Date(date);
		firstDate.setDate(1);
		var startDate = new Date(firstDate);
		var startOffset = startDate.getDay();
		if (startOffset == 0) {
			startOffset = -7;
		} else {
			startOffset = -startOffset;
		}

		var index = date.getDate() - startOffset - 1;
		return index;
	}



});