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
	test("任意の年月を表示", function() {
		var testDate = new Date(2012, 11, 11);
		this.controller.setFirstDate(testDate);

		var index = getDomOfDate(testDate);
		var actualCell = $('.day').get(index);
		//		var actualDate = $(actualCell).data('data').date;
		var actualDay = $(actualCell).html();
		equal(actualDay, 11, '任意の日を設定して表示すること。');

		var actualMonth = $('.monyear >div> span').get(0).innerHTML;
		actualMonth = $.inArray(actualMonth, this.monthNames);
		equal(actualMonth, 11, '任意の月を設定して表示すること。');

		var actualYear = $('.monyear >div> span').get(1).innerHTML;
		equal(actualYear, 2012, '任意の年を設定して表示すること。');

		ok(true, '任意の年月を設定して表示すること。');
	});

	test("任意の年月を選択", function() {
		var testDate = new Date(2012, 11, 11);
		this.controller.setDate(testDate);

		var actualDate = $('.selected').data('data').date;

		strictEqual(actualDate.getTime(), testDate.getTime(), '任意の年を選択すること。');
	});

	test("getFirstDate関数", function() {
		// When init, this.controller._firstDate is today
		// Need set again
		var testDate = new Date(2012, 11, 1);
		//this.controller.setFirstDate(testDate);

		// testDateの月、最初の日を取得
		var actualDate = this.controller.getFirstDate(testDate);
		var expectedDate = testDate;
		strictEqual(actualDate.getTime(), expectedDate.getTime(), '表示中の月に、最初の日を取得すること。');

		// 先月、最初の日を取得
		actualDate = this.controller.getFirstDate(testDate, -1);
		expectedDate = new Date(2012, 10, 1);
		strictEqual(actualDate.getTime(), expectedDate.getTime(), '先月に、最初の日を取得すること。');

		// 再来月、最初の日を取得
		actualDate = this.controller.getFirstDate(testDate, 2);
		expectedDate = new Date(2013, 1, 1);
		strictEqual(actualDate.getTime(), expectedDate.getTime(), '再来月に、最初の日を取得すること。');
	});

	test("選択モード変更：特定の日", function() {
		// Single Mode
		this.controller.setSelectMode('single');

		// 選択したい日付
		var testDate = new Date(2013, 10, 27);
		var index = getDomOfDate(testDate);
		var actualCell = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(actualCell).click();

		// DOMで選択されている日付を取得
		var count = $('.selected').length;
		equal(count, 1, "画面で選択されている日の数は１であること。");
		var actualDate = $('.selected').data('data').date;
		strictEqual(actualDate.getTime(), testDate.getTime(), '画面で"'
				+ testDate.toLocaleDateString() + '"は選択されていること。');
	});

	test("選択モード：連続する日", function() {
		// 連続する日のモード
		this.controller.setSelectMode('continue');

		// 選択したい日付
		var testStartDate = new Date(2013, 10, 17);
		var index = getDomOfDate(testStartDate);
		var startCell = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(startCell).click();

		var testEndDate = new Date(2013, 10, 26);
		index = getDomOfDate(testEndDate);
		var endCell = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(endCell).click();

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


	test("選択モード：複数の日", function() {
		// 選択したい日付
		var testDate1 = new Date(2013, 10, 17);
		var index = getDomOfDate(testDate1);
		var cell1 = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(cell1).click();

		// 複数の日のモード
		this.controller.setSelectMode('multi');

		var testDate2 = new Date(2013, 10, 26);
		index = getDomOfDate(testDate2);
		var cell2 = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(cell2).click();

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

	test("getSelectedDate関数：特定の日", function() {
		// Single Mode
		this.controller.setSelectMode('single');

		// 選択したい日付
		var testDate = new Date(2013, 10, 27);
		var index = getDomOfDate(testDate);
		var actualCell = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(actualCell).click();

		// getSelectedDate
		var actualDate = this.controller.getSelectedDate();
		equal(actualDate.length, 1, "SelectedDate配列が１項目あること。");
		strictEqual(actualDate[0].getTime(), testDate.getTime(), '取得された日付は"'
				+ testDate.toLocaleDateString() + '"であること。');
	});


	test("getSelectedDate関数：連続する日", function() {
		// 連続する日のモード
		this.controller.setSelectMode('continue');

		// 選択したい日付
		var testStartDate = new Date(2013, 10, 17);
		var index = getDomOfDate(testStartDate);
		var startCell = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(startCell).click();

		var testEndDate = new Date(2013, 11, 2);
		// 12月のカレンダーに移動
		this.controller.setFirstDate(testEndDate);
		index = getDomOfDate(testEndDate);
		var endCell = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(endCell).click();

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
				+ testStartDate.toLocaleDateString() + '"までであること。');

	});

	test("getSelectedDate関数：複数の日", function() {
		// 選択したい日付
		var testDate1 = new Date(2013, 10, 17);
		var index = getDomOfDate(testDate1);
		var cell1 = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(cell1).click();

		// 複数の日のモード
		this.controller.setSelectMode('multi');

		var testDate2 = new Date(2013, 10, 26);
		index = getDomOfDate(testDate2);
		var cell2 = $('.day').get(index);
		// clickイベントを実行することで、日付を選択する。
		$(cell2).click();

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

	asyncTest("setUnselectedDate関数", function() {
		var that = this;
		var testDates = [new Date(2013, 10, 7), new Date(2013, 10, 9), new Date(2013, 10, 17),
				new Date(2013, 10, 24)];
		this.controller.setUnselectedDate(testDates);

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

		setTimeout(function() {
			that.controller.setUnselectedDate();
			count = $('.noday').length;
			equal(count, 0, "全ての日を選択できてなること。");
			start();
		}, 1000);
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
			that.controller.setFirstDate(new Date(1988, 1, 14));
			for ( var i = 0; i < $('.sun').length; i++) {
				var actualCell = $('.sun').get(i);
				if (!$(actualCell).hasClass('style1')) {
					result = false;
					break;
				}
			}
			ok(result, '他の日付に移動した後、日曜日はスタイルも変更されること。');
			start();
		}, 1000);

	});

	asyncTest("setMarker関数",
			function() {
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

	test("setText関数", function() {
		var testDate = new Date(2013, 10, 17);
		this.controller.setText(testDate, 'This is ' + testDate.toLocaleDateString());

		var index = getDomOfDate(testDate);
		var cell = $('.day').get(index);
		var text = $(cell).data('data').data;
		$(cell).mouseover();

		strictEqual(text, 'This is ' + testDate.toLocaleDateString(), '"'
				+ testDate.toLocaleDateString() + '"では、文字列が設定されて、ツールチップが表示できること。');
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