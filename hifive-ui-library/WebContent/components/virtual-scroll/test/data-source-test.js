/*
 * Copyright (C) 2013-2014 NS Solutions Corporation
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
 * hifive
 */

/*global h5, QUnit, module, test, asyncTest, ok, strictEqual, deepEqual, notDeepEqual, throws, start, sinon, jscoverage_report */

(function() {
	'use strict';

	QUnit.config.testTimeout = 1000;

	var createLocalDataSource = h5.ui.components.virtualScroll.data.createLocalDataSource;

	var EMPTY_ARY = [];

	var SINGLE_ARY = [{
		value: 1
	}];

	var MULTIPLE_ARY = [{
		type: 'a',
		value: 20
	}, {
		type: 'c',
		value: 40
	}, {
		type: 'a',
		value: 10
	}];

	// ---- LocalDataSource ---- //

	/**
	 * createLocalDataSource
	 */
	module('Local createLocalDataSource(baseData)');

	test('空の配列を渡す。渡した配列と設定されたリストが等しい', 1, function() {
		deepEqual(createLocalDataSource(EMPTY_ARY)._searched, EMPTY_ARY);
	});

	test('要素が1つの配列を渡す。渡した配列と設定されたリストが等しい', 1, function() {
		deepEqual(createLocalDataSource(SINGLE_ARY)._searched, SINGLE_ARY);
	});

	test('複数要素を持つ配列を渡す。渡した配列と設定されたリストが等しい', 1, function() {
		deepEqual(createLocalDataSource(MULTIPLE_ARY)._searched, MULTIPLE_ARY);
	});

	test('nullを渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			createLocalDataSource(null);
		}, /不正な引数です/);
	});

	test('配列以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			createLocalDataSource(1);
		}, /不正な引数です/);
	});


	/**
	 * sliceAsync
	 */
	//TODO: slice()の仕様と異なる部分があります。要検討
	module('Local sliceAsync(start,end)', {
		setup: function() {
			this.source = createLocalDataSource(MULTIPLE_ARY);
		},
		source: null
	});

	asyncTest('範囲内を指定。start～endの範囲で取得', 1, function() {
		this.source.sliceAsync(0, 3).then(function(result) {
			deepEqual(result, MULTIPLE_ARY);// データの長さ＝3なので境界値の内側
			start();
		});
	});

	asyncTest('endが範囲外を指定。start～末尾の範囲で取得', 1, function() {
		this.source.sliceAsync(0, 4).then(function(result) {
			deepEqual(result, MULTIPLE_ARY);// データの長さ＝3なので境界値の外側
			start();
		});
	});

	asyncTest('範囲外を指定。空配列を取得', 1, function() {
		this.source.sliceAsync(4, 5).then(function(result) {
			deepEqual(result, []);
			start();
		});
	});

	asyncTest('startを渡さない。0～endの範囲で取得', 1, function() {
		this.source.sliceAsync(null, 3).then(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	//TODO: slice()と挙動が異なる
	asyncTest('endを渡さない。start～totalLengthの範囲で取得', 1, function() {
		this.source.sliceAsync(0).then(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	asyncTest('start,endを渡さない。0～totalLengthの範囲で取得', 1, function() {
		this.source.sliceAsync().then(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	//TODO: slice()と挙動が異なる
	asyncTest('start,endにnullを渡す。0～totalLengthの範囲で取得', 1, function() {
		this.source.sliceAsync(null, null).then(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	//TODO: slice()と挙動が異なる
	test('start,endに数値以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.sliceAsync('test', 'test');
		}, /不正な引数です/);
	});

	asyncTest('start,endに同値を渡す。正数の場合、空配列を取得', 1, function() {
		this.source.sliceAsync(1, 1).then(function(result) {
			deepEqual(result, []);
			start();
		});
	});

	asyncTest('start,endに同値を渡す。負数の場合、空配列を取得', 1, function() {
		this.source.sliceAsync(-1, -1).then(function(result) {
			deepEqual(result, []);
			start();
		});
	});

	asyncTest('start > endな正数を渡す。空配列を取得', 1, function() {
		this.source.sliceAsync(1, 0).then(function(result) {
			deepEqual(result, []);
			start();
		});
	});

	asyncTest('start > endな負数を渡す。totalLength加算後、start < end かつ どちらも正数の場合、値を取得', 1, function() {
		this.source.sliceAsync(-2, -1).then(function(result) {
			deepEqual(result, MULTIPLE_ARY.slice(1, 2));
			start();
		});
	});

	asyncTest('start > endな負数を渡す。totalLength加算後、start > endの場合、空配列を取得', 1, function() {
		this.source.sliceAsync(-1, -2).then(function(result) {
			deepEqual(result, []);
			start();
		});
	});

	asyncTest('start > endな負数を渡す。totalLength加算後、どちらか一方でも負数の場合、空配列を取得', 1, function() {
		this.source.sliceAsync(-4, -5).then(function(result) {
			deepEqual(result, []);
			start();
		});
	});


	/**
	 * setBaseData
	 */
	module('Local setBaseData(baseData)', {
		setup: function() {
			this.source = createLocalDataSource(MULTIPLE_ARY);
		},
		source: null
	});

	asyncTest('空の配列を渡す。設定したデータと元のデータが等しい', 1, function() {
		this.source.setBaseData(EMPTY_ARY);
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, EMPTY_ARY);
			start();
		});
	});

	asyncTest('１つの要素を持つ配列を渡す。設定したデータと元のデータが等しい', 1, function() {
		this.source.setBaseData(SINGLE_ARY);
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, SINGLE_ARY);
			start();
		});
	});

	asyncTest('複数の要素を持つ配列を渡す。設定したデータと元のデータが等しい', 1, function() {
		this.source.setBaseData(MULTIPLE_ARY);
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	test('nullを渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.setBaseData(null);
		}, /不正な引数です/);
	});

	test('配列以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.setBaseData(1);
		}, /不正な引数です/);
	});


	/**
	 * setFilterFunction
	 */
	module('Local setFilterFunction(key,filterFunction) 絞込条件の設定', {
		setup: function() {
			this.source = createLocalDataSource(MULTIPLE_ARY);
			this.TYPE_FILTER = function(filterArg, data) {
				return data.type !== filterArg;
			};
			this.filterObj = {
				filter: {
					type: 'a'
				}
			};
		},
		source: null,
		TYPE_FILTER: null,
		filterObj: null
	});

	asyncTest('絞込のキーと絞込関数を渡す。キーでフィルタできる', 1, function() {
		this.source.setFilterFunction('type', this.TYPE_FILTER);
		this.source.changeSearchOptions(this.filterObj);

		this.source.sliceAsync().done(function(result) {
			deepEqual(result, MULTIPLE_ARY.slice(1, 2));
			start();
		});
	});

	test('絞込のキーにnullを渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.setFilterFunction(null, this.TYPE_FILTER);
		}, /不正な引数です/);
	});

	test('絞込関数にnullを渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.setFilterFunction('type', null);
		}, /不正な引数です/);
	});

	test('絞込のキーと絞込関数にnullを渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.setFilterFunction(null, null);
		}, /不正な引数です/);
	});

	test('絞込関数に関数以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.setFilterFunction('type', 10);
		}, /不正な引数です/);
	});

	test('絞込のキーに文字列以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.setFilterFunction(10, this.TYPE_FILTER);
		}, /不正な引数です/);
	});


	/**
	 * changeSearchOptions
	 * <p>
	 * setFilterFunction呼出し後に呼び出す
	 */
	module('Local changeSearchOptions(searchOptions) setFilterFunction呼出し後に実行', {
		setup: function() {
			this.source = createLocalDataSource(MULTIPLE_ARY);
			this.TYPE_FILTER = function(filterArg, data) {
				return data.type !== filterArg;
			};
			this.source.setFilterFunction('type', this.TYPE_FILTER);
		},
		source: null,
		TYPE_FILTER: null
	});

	asyncTest('フィルタができる', 1, function() {
		this.source.changeSearchOptions({
			filter: {
				type: 'a'
			}
		});
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, MULTIPLE_ARY.slice(1, 2));
			start();
		});
	});

	test('登録されていない絞込条件のキーを渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.changeSearchOptions({
				filter: {
					unknownFilter: 10
				}
			});
		}, /マッチする filter が存在しません/);
	});

	asyncTest('{filter:null}を渡す。全件検索となる', 1, function() {
		this.source.changeSearchOptions({
			filter: null
		});
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	asyncTest('1つのソート条件でソートできる', 1, function() {
		this.source.changeSearchOptions({
			sort: [{
				property: 'type',
				order: 'desc'
			}]
		});
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, [MULTIPLE_ARY[1], MULTIPLE_ARY[0], MULTIPLE_ARY[2]]);
			start();
		});
	});

	asyncTest('2つのソート条件でソートできる', 1, function() {
		this.source.changeSearchOptions({
			sort: [{
				property: 'type',
				order: 'desc'
			}, {
				property: 'value',
				order: 'asc'
			}]
		});
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, [MULTIPLE_ARY[1], MULTIPLE_ARY[2], MULTIPLE_ARY[0]]);
			start();
		});
	});

	asyncTest('ソート条件を渡す。propertyはnull。ソートしていない値を取得', 1, function() {
		this.source.changeSearchOptions({
			sort: [{
				property: null,
				order: 'desc'
			}]
		});
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	asyncTest('ソート条件を渡す。orderはnull。propertyを昇順にソートした値を取得', 1, function() {
		this.source.changeSearchOptions({
			sort: [{
				property: 'type',
				order: null
			}]
		});
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, [MULTIPLE_ARY[0], MULTIPLE_ARY[2], MULTIPLE_ARY[1]]);
			start();
		});
	});

	asyncTest('フィルタとソートができる', 1, function() {
		this.source.changeSearchOptions({
			filter: {
				type: 'c'
			},
			sort: [{
				property: 'value',
				order: 'asc'
			}]
		});
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, [MULTIPLE_ARY[2], MULTIPLE_ARY[0]]);
			start();
		});
	});

	asyncTest('nullを渡す。全件検索となる', 1, function() {
		this.source.changeSearchOptions(null);
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	asyncTest('引数を空にする。全件検索となる', 1, function() {
		this.source.changeSearchOptions();
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	asyncTest('空オブジェクトを渡す。全件検索となる', 1, function() {
		this.source.changeSearchOptions({});
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, MULTIPLE_ARY);
			start();
		});
	});

	test('オブジェクト以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.changeSearchOptions('test');
		}, /不正な引数です/);
	});


	/**
	 * changeSearchOptions
	 * <p>
	 * setFilterFunctionを呼ぶ前にchangeSearchOptionsを呼ぶ場合。
	 */
	module('Local changeSearchOptions(searchOptions) setFilterFunction呼出し前に実行', {
		setup: function() {
			this.source = createLocalDataSource(MULTIPLE_ARY);
		},
		source: null
	});

	test('フィルタ条件を指定する。登録されていないプロパティを指定した場合と同じになる', function() {
		throws(function() {
			var options = {
				filter: {
					unknownFilter: 'a'
				}
			};
			this.source.changeSearchOptions(options);
		}, /マッチする filter が存在しません/);
	});

	test('ソート条件を指定。ソートした値を取得', function() {
		var options = {
			sort: [{
				property: 'value',
				order: 'asc'
			}]
		};

		this.source.changeSearchOptions(options);
		this.source.sliceAsync().done(function(result) {
			deepEqual(result, [MULTIPLE_ARY[2], MULTIPLE_ARY[0], MULTIPLE_ARY[1]]);
		});
	});

	test('フィルタ・ソート条件を指定する。登録されていないプロパティを指定した場合と同じになる', function() {
		throws(function() {
			var options = {
				filter: {
					unknowunFilter: 'a'
				},
				sort: [{
					property: 'value',
					order: 'asc'
				}]
			};
			this.source.changeSearchOptions(options);
		}, /マッチする filter が存在しません/);
	});


	/**
	 * getSearchOptions()
	 */
	module('Local getSearchOptions()', {
		setup: function() {
			this.source = createLocalDataSource(MULTIPLE_ARY);
			this.TYPE_FILTER = function(filterArg, data) {
				return data.type !== filterArg;
			};
			this.source.setFilterFunction('type', this.TYPE_FILTER);
		},
		source: null,
		TYPE_FILTER: null
	});

	asyncTest('フィルタ条件を取得', function() {
		var that = this;
		var options = {
			type: 'a'
		};
		var listener = function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		};

		this.source.addEventListener('changeSource', listener);
		this.source.changeSearchOptions(options);
	});

	asyncTest('複数のフィルタ条件を取得', function() {
		var that = this;
		var options = {
			type: 'a',
			value: '10'
		};
		var listener = function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		};

		this.source.addEventListener('changeSource', listener);
		this.source.changeSearchOptions(options);
	});

	asyncTest('ソート条件を取得', function() {
		var that = this;
		var options = {
			sort: [{
				property: 'type',
				order: 'desc'
			}]
		};
		var listener = function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		};

		this.source.addEventListener('changeSource', listener);
		this.source.changeSearchOptions(options);
	});

	asyncTest('複数のソート条件を取得', function() {
		var that = this;
		var options = {
			sort: [{
				property: 'type',
				order: 'desc'
			}, {
				property: 'value',
				order: 'asc'
			}]
		};
		var listener = function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		};

		this.source.addEventListener('changeSource', listener);
		this.source.changeSearchOptions(options);
	});

	asyncTest('フィルタ条件とソート条件を取得', function() {
		var that = this;
		var options = {
			filter: {
				type: 'c'
			},
			sort: [{
				property: 'value',
				order: 'asc'
			}]
		};
		var listener = function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		};

		this.source.addEventListener('changeSource', listener);
		this.source.changeSearchOptions(options);
	});


	/**
	 * setDefaultDispSize
	 */
	module('Local setDefaultDispSize()');

	test('LocalDataSourceでsetDefaultDispSize()は何もしない', 1, function() {
		ok(true, 'このassertは必ず成功する');
	});


	/**
	 * getTotalLength
	 */
	module('Local getTotalLength()');

	test('空配列から作成したデータリストの長さを取得', 1, function() {
		strictEqual(createLocalDataSource(EMPTY_ARY).getTotalLength(), EMPTY_ARY.length);
	});

	test('１つの要素を持つ配列から作成したデータリストの長さを取得', 1, function() {
		strictEqual(createLocalDataSource(SINGLE_ARY).getTotalLength(), SINGLE_ARY.length);
	});

	test('複数要素を持つ配列から作成したデータリストの長さを取得', 1, function() {
		strictEqual(createLocalDataSource(MULTIPLE_ARY).getTotalLength(), MULTIPLE_ARY.length);
	});


	/**
	 * isCached
	 */
	//TODO: slice()の仕様と異なる部分があります。要検討
	// slice()の仕様に沿うと必ずtrueになる(仕様では数値以外でも空配列が戻る)？
	module('Local isCached(start,end)', {
		setup: function() {
			this.source = createLocalDataSource(MULTIPLE_ARY);
		},
		source: null
	});

	test('範囲内を指定。trueが戻る。データの長さ＝3なので境界値の内側', 1, function() {
		ok(this.source.isCached(0, 3));
	});

	test('endが範囲外を指定。falseが戻る。データの長さ＝4なので境界値の外側', 1, function() {
		ok(!this.source.isCached(0, 4));
	});

	test('startを渡さない(0～endの範囲を指定)。trueが戻る', 1, function() {
		ok(this.source.isCached(null, 3));
	});

	test('endを渡さない(start～totalLengthの範囲を指定)。trueが戻る', 1, function() {
		ok(this.source.isCached(0, this.source.getTotalLength()));
	});

	test('start,endを渡さない(0～totalLengthの範囲を指定)。trueが戻る', 1, function() {
		ok(this.source.isCached());
	});

	test('start,endにnullを渡す(0～totalLengthの範囲を指定)。trueが戻る', 1, function() {
		ok(this.source.isCached(null, null));
	});

	//TODO: slice()と挙動が異なる
	test('数値以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.isCached('test', 'test');
		}, /不正な引数です/);
	});

	test('start,endに同値を渡す。正数、負数のいずれの場合もtrueが戻る', 2, function() {
		// slice()の仕様では、同値は空配列を取得ため
		// isCached()でもtrueとする。
		ok(this.source.isCached(3, 3), '正数で同値');
		ok(this.source.isCached(-2, -2), '負数で同値');
	});

	test('start > endな正数を渡す。trueが戻る', 1, function() {
		// slice()の仕様では、start ＞ end かつ どちらも正数ならば
		// 空配列を取得ため、isCached()もtrueとする。
		ok(this.source.isCached(3, 1));
	});

	test('start > endな負数を渡す。start+totalLength ～ end+totalLengthの範囲を指定。いずれの場合もtrueが戻る', 3,
			function() {
				// slice()の仕様では、どの場合でも空配列を取得ため
				// isCached()もtrueとする。
				ok(this.source.isCached(-3, -1), 'start < end かつ どちらも正数となる場合');
				ok(this.source.isCached(-1, -3), 'start > endとなる場合');
				ok(this.source.isCached(-5, -4), 'どちらか一方でも負数のままの場合');
			});


	/**
	 * sliceCachedData
	 */
	//TODO: slice()の仕様と異なる部分があります。要検討
	module('Local sliceCachedData(start, end)', {
		setup: function() {
			this.source = createLocalDataSource(MULTIPLE_ARY);
		},
		source: null
	});

	test('範囲内を指定。指定範囲を取得', 1, function() {
		deepEqual(this.source.sliceCachedData(0, 3), MULTIPLE_ARY, 'データの長さ=3なので、境界値の内側');
	});

	test('endが範囲外を指定。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.sliceCachedData(0, 4);// データの長さ＝4なので、境界値の外側
		}, /指定した範囲にキャッシュされていないデータが含まれています/);
	});

	test('startを渡さない(0～endの範囲を指定)', 1, function() {
		deepEqual(this.source.sliceCachedData(null, 3), MULTIPLE_ARY);
	});

	//TODO: slice()と挙動が異なる
	test('endを渡さない(start～totalLengthの範囲を指定)', 1, function() {
		deepEqual(this.source.sliceCachedData(0), MULTIPLE_ARY);
	});

	test('start,endを渡さない(0～totalLengthの範囲を指定)', 1, function() {
		deepEqual(this.source.sliceCachedData(), MULTIPLE_ARY);
	});

	//TODO: slice()と挙動が異なる
	test('start,endにnullを渡す(0～totalLengthの範囲を指定)', 1, function() {
		deepEqual(this.source.sliceCachedData(null, null), MULTIPLE_ARY);
	});

	//TODO: slice()と挙動が異なる
	test('数値以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.sliceCachedData('test', 'test');
		}, '不正な引数です');

	});

	test('start,endに同値を渡す。空配列を取得', 2, function() {
		// slice()の仕様では、同値の場合はいずれも空配列を取得ので
		// sliceCachedData()でも空配列を取得。
		deepEqual(this.source.sliceCachedData(1, 1), [], '正数の場合');
		deepEqual(this.source.sliceCachedData(-1, -1), [], '負数の場合');
	});

	test('start > endな正数を渡す。空配列を取得', 1, function() {
		// slice()の仕様では、start ＞ endの場合は空配列を取得ので
		// sliceCachedData()でも空配列を取得。
		deepEqual(this.source.sliceCachedData(1, 0), []);
	});

	test('start > endな負数を渡す。start＋totalLenth ～ end＋totalLengthの範囲を指定', 3,
			function() {
				deepEqual(this.source.sliceCachedData(-3, -1), MULTIPLE_ARY.slice(0, 2),
						'totalLength加算後、start < end かつ どちらも正数となる場合、値を取得');

				// slice()の仕様では、totalLength加算後も負数となる引数は0として扱うので
				// sliceCachedData()でも加算後負数の場合は0として扱う。
				deepEqual(this.source.sliceCachedData(-100, -90), [],
						'totalLength加算後、どちらも負数の場合、空配列を取得');

				deepEqual(this.source.sliceCachedData(-1, -3), [],
						'totalLength加算後、start ＞ end の場合、空配列を取得');
			});


	/**
	 * getCachedData
	 */
	module('Local getCachedData(index)', {
		setup: function() {
			this.source = createLocalDataSource(MULTIPLE_ARY);
		},
		source: null
	});

	test('範囲内のindexを指定。指定したindexの値を取得', 2, function() {
		strictEqual(this.source.getCachedData(0), MULTIPLE_ARY[0], '0を渡した場合、');
		strictEqual(this.source.getCachedData(2), MULTIPLE_ARY[2], 'データの長さ＝3なので境界理の内側');
	});

	test('範囲外のindexを指定。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.getCachedData(4);//データの長さ＝3なので境界値の外側
		}, /不正な引数です/);
	});

	test('indexを渡さない。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.getCachedData();
		}, /不正な引数です/);
	});

	test('nullを渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.getCachedData(null);
		}, /不正な引数です/);
	});

	test('数値以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.getCachedData('test');
		}, /不正な引数です/);
	});

	test('負数を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.getCachedData(-1);
		}, /不正な引数です/);
	});


	/**
	 * 2回createLocalDataSourceを呼んだとき、設定が共有されないことをチェック
	 * <p>
	 * 他のメソッドを使用している為、上記のcreateLocalDataSourceのmoduleとは切り離しました
	 */
	module('Local createLocalDataSource(baseData) 生成したデータが設定を共有していないかチェック', {
		setup: function() {
			this.TYPE_FILTER = function(filterArg, data) {
				return data.type !== filterArg;
			};
			this.searchOptions = {
				filter: {
					type: 'c'
				},
				sort: [{
					property: 'value',
					order: 'asc'
				}]
			};
		},
		searchOptions: null,
		TYPE_FILTER: null
	});

	asyncTest('createLocalDataSourceを2回呼び、設定が共有されていないかチェック', function() {
		var source;

		source = createLocalDataSource(MULTIPLE_ARY);
		source.setFilterFunction('type', this.TYPE_FILTER);
		source.changeSearchOptions(this.searchOptions);

		source.sliceAsync().then(function(dataFirst) {

			source = createLocalDataSource(MULTIPLE_ARY);
			source.sliceAsync().then(function(dataSecond) {

				notDeepEqual(dataFirst, dataSecond);
				start();
			});
		});
	});


	// ---- LazyLoadDataSource ---- //
	// TODO: ここからLazyLoad

	var createLazyLoadDataSource = h5.ui.components.virtualScroll.data.createLazyLoadDataSource;

	var URL = 'test/lazy';// fakeServerに設定するURL

	var MULTIPLE_DATA = {
		list: [{
			type: 'a',
			value: 20
		}, {
			type: 'c',
			value: 40
		}],
		totalCount: 2
	};

	// データの長さ＝引数length,totalCount＝引数totalLengthのデータを生成する関数
	var createData = function(length, totalLength) {
		var data = {
			list: [],
			totalCount: totalLength
		};
		for (var i = 0; i < length; i++) {
			data.list[i] = i;
		}
		return data;
	};


	/**
	 * createLazyLoadDataSource
	 */
	module('LazyLoad createLazyLoadDataSource(url, ajaxSettings, customRequestData)', {
		setup: function() {
			this.setting = {
				type: 'POST'
			};
			this.customReq = {
				a: 1
			};
		},
		setting: null,
		customReq: null
	});

	test('LazyLoadDataSourceを作成できる', 3, function() {
		var source = createLazyLoadDataSource(URL, this.setting, this.customReq);

		strictEqual(source._url, URL);
		deepEqual(source._ajaxSettings, {
			type: 'POST'
		});
		strictEqual(source._customRequestData, this.customReq);
	});

	test('引数を渡さない。エラーメッセージ出力', 1, function() {
		throws(function() {
			createLazyLoadDataSource();
		}, /不正な引数です/);
	});

	test('nullを渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			createLazyLoadDataSource(null, null, null);
		}, /不正な引数です/);
	});

	test('URLを渡さない。エラーメッセージ出力', 1, function() {
		throws(function() {
			createLazyLoadDataSource(null, this.setting, this.customReq);
		}, /不正な引数です/);
	});


	/**
	 * changeSearchOptionsのリクエストパラメータチェック
	 */
	module('LazyLoad changeSearchOptions(searchOptions) リクエストパラメータに反映されている', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);
			this.server = sinon.fakeServer.create();
		},
		teardown: function() {
			this.server.restore();
		},
		source: null,
		server: null
	});

	asyncTest('フィルタ、ソート条件なしのリクエストパラメータをチェックする', 3, function() {
		// 第1引数では正規表現で全てのリクエストを受け入れる
		// 第2引数で、リクエストパラメータに正しいパーツが揃っているかチェックする関数を登録
		this.server.respondWith(/.*/, function(xhr) {

			ok((/start=[0-9]{0,}/).test(xhr.url));
			ok((/end=[0-9]{0,}/).test(xhr.url));
			ok((/requireTotalCount=true/).test(xhr.url));

			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('フィルタ条件ありのリクエストパラメータをチェックする。', 1, function() {
		// 第1引数では正規表現で全てのリクエストを受け入れる
		// 第2引数で、リクエストパラメータにfilterで指定したパーツが揃っているかチェックする関数を登録
		this.server.respondWith(/.*/, function(xhr) {
			ok((/value=[0-9]{0,}/).test(xhr.url), '指定したフィルタがある');
			start();
		});

		this.source.changeSearchOptions({
			filter: {
				value: 10
			}
		});
		this.server.respond();
	});

	asyncTest('ソート条件ありのリクエストパラメータをチェックする。', 2, function() {
		// 第1引数では正規表現で全てのリクエストを受け入れる
		// 第2引数で、リクエストパラメータにfilterで指定したパーツが揃っているかチェックする関数を登録
		this.server.respondWith(/.*/, function(xhr) {

			ok((/sortKey=type/).test(xhr.url), '指定したsortKeyがある');
			ok((/sortOrder=desc/).test(xhr.url), '指定したsortOrderがある');

			start();
		});

		this.source.changeSearchOptions({
			sort: [{
				property: 'type',
				order: 'desc'
			}]
		});
		this.server.respond();
	});


	asyncTest('フィルタ、ソート条件ありのリクエストパラメータをチェックする。', 3, function() {
		// 第1引数では正規表現で全てのリクエストを受け入れる
		// 第2引数で、リクエストパラメータにfilterで指定したパーツが揃っているかチェックする関数を登録
		this.server.respondWith(/.*/, function(xhr) {

			ok((/value=[0-9]{0,}/).test(xhr.url), '指定したフィルタがある');
			ok((/sortKey=type/).test(xhr.url), '指定したsortKeyがある');
			ok((/sortOrder=desc/).test(xhr.url), '指定したsortOrderがある');

			start();
		});

		this.source.changeSearchOptions({
			filter: {
				value: 10
			},
			sort: [{
				property: 'type',
				order: 'desc'
			}]
		});
		this.server.respond();
	});

	test('オブジェクト以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.changeSearchOptions("test");
		}, /不正な引数です/);
	});


	/**
	 * getSearchOptions
	 */
	module('LazyLoad getSearchOptions()', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);
			this.server = sinon.fakeServer.create();
			this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));
		},
		source: null,
		server: null
	});

	asyncTest('フィルタ条件を取得', function() {
		var that = this;
		var options = {
			filter: {
				type: 'a'
			}
		};

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		});

		this.source.changeSearchOptions(options);
		this.server.respond();
	});

	asyncTest('複数のフィルタ条件を取得', function() {
		var that = this;
		var options = {
			type: 'a',
			value: '10'
		};

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		});

		this.source.changeSearchOptions(options);
		this.server.respond();
	});

	asyncTest('ソート条件を取得', function() {
		var that = this;
		var options = {
			sort: [{
				property: 'type',
				order: 'desc'
			}]
		};

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		});

		this.source.changeSearchOptions(options);
		this.server.respond();
	});

	asyncTest('複数のソート条件を取得', function() {
		var that = this;
		var options = {
			sort: [{
				property: 'type',
				order: 'desc'
			}, {
				property: 'value',
				order: 'asc'
			}]
		};

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		});

		this.source.changeSearchOptions(options);
		this.server.respond();
	});

	asyncTest('フィルタ条件とソート条件を取得', function() {
		var that = this;
		var options = {
			filter: {
				type: 'c'
			},
			sort: [{
				property: 'value',
				order: 'asc'
			}]
		};

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.getSearchOptions(), options);
			start();
		});

		this.source.changeSearchOptions(options);
		this.server.respond();
	});


	/**
	 * isCachedの動作チェック
	 */
	//TODO: slice()の仕様と異なる部分があります。要検討
	module('LazyLoad isCached(start,end) 取得件数をチェック', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);
			this.server = sinon.fakeServer.create();
			this.server.respondWith(/.*/, JSON.stringify(createData(2, 3)));// 長さ＝2,totalLength＝3のデータを生成
		},
		teardown: function() {
			this.server.restore();
		},
		source: null,
		server: null
	});

	asyncTest('キャッシュ範囲内を渡す。trueが戻る', 1, function() {
		var that = this;
		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached(0, 2));// データの長さ＝2のため、境界値の内側
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('endがキャッシュ範囲外を渡す。falseが戻る', 1, function() {
		var that = this;
		this.source.addEventListener('changeSource', function() {
			ok(!that.source.isCached(0, 3));// データの長さ＝2のため、境界値の外側
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('startを渡さない(0～endの範囲を指定)。trueが戻る', 1, function() {
		var that = this;
		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached(null, 2));
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。nullの場合は空配列が戻るためtrueとなる(結果はどちらもtrueで同じ)
	asyncTest('endを渡さない(start～totalLengthの範囲を指定)。totalLengthがキャッシュ範囲内ならばtrueが戻る', 1, function() {
		var that = this;

		this.source = createLazyLoadDataSource(URL);
		this.server = sinon.fakeServer.create();
		this.server.respondWith(/.*/, JSON.stringify(createData(2, 2)));// 長さ＝2,totalLength＝2のデータを生成

		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached(0));
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。nullの場合は空配列が戻るためtrueとなる。undefinedならtotalLengthになるので、範囲外ならfalse
	asyncTest('endを渡さない(start～totalLengthの範囲を指定)。totalLengthがキャッシュ範囲外ならばfalseが戻る', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			ok(!that.source.isCached(0));
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start,endを渡さない(0～totalLengthの範囲を指定)。totalLengthがキャッシュ範囲内ならばtrueが戻る', 1, function() {
		var that = this;

		this.source = createLazyLoadDataSource(URL);
		this.server = sinon.fakeServer.create();
		this.server.respondWith(/.*/, JSON.stringify(createData(2, 2)));// 長さ＝2,totalLength＝2のデータを生成

		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached());
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start,endを渡さない(0～totalLengthの範囲を指定)。totalLengthがキャッシュ範囲外ならばfalseが戻る', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			ok(!that.source.isCached());
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	asyncTest('start,endにnullを渡す(0～totalLengthの範囲を指定)。totalLengthがキャッシュ範囲内ならばtrueが戻る', 1,
			function() {
				var that = this;

				this.source = createLazyLoadDataSource(URL);
				this.server = sinon.fakeServer.create();
				this.server.respondWith(/.*/, JSON.stringify(createData(2, 2)));// 長さ＝2,totalLength＝2のデータを生成

				this.source.addEventListener('changeSource', function() {
					ok(that.source.isCached(null, null));
					start();
				});

				this.source.changeSearchOptions({});
				this.server.respond();
			});

	//TODO: slice()と挙動が異なる
	asyncTest('start,endにnullを渡す(0～totalLengthの範囲を指定)。totalLengthがキャッシュ範囲外ならばfalseが戻る', 1,
			function() {
				var that = this;

				this.source.addEventListener('changeSource', function() {
					ok(!that.source.isCached(null, null));
					start();
				});

				this.source.changeSearchOptions({});
				this.server.respond();
			});

	test('数値以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.isCached("test1", "test2");
		}, /不正な引数です/);
	});

	asyncTest('start,endに同値を渡す。trueが戻る', 1, function() {
		// slice()では同値の場合、空配列を戻す。
		// そのためisCached()ではtrueを戻す。
		var that = this;

		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached(1, 1));
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start > endな値を渡す。trueが戻る', 1, function() {
		// slice()ではstart＞endの場合、空配列を戻す。
		// そのためisCached()ではtrueを戻す。
		var that = this;
		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached(2, 0));
			start();
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('startに負数を渡す。(start + totalLength)～endの範囲を指定', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached(-2, 1), '加算後、start＜end の場合');
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('startに負数を渡す。(start + totalLength)～endの範囲を指定', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached(-1, 0), '加算後、start＞endの場合');
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('endに負数を渡す。start～(end + totalLength)の範囲を指定', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached(0, -1), 'start＜endの場合');
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('endに負数を渡す。start～(end + totalLength)の範囲を指定', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			ok(that.source.isCached(1, -2), 'start＞endの場合');
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});


	/**
	 * setAjaxSettings
	 */
	module('LazyLoad setAjaxSettings(ajaxSettings)', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);
			this.server = sinon.fakeServer.create();
		},
		teardown: function() {
			this.server.restore();
		},
		source: null,
		server: null
	});

	asyncTest('ajaxSettings={type:POST} 設定が反映されている', 1, function() {
		this.server.respondWith(/.*/, function(xhr) {
			strictEqual(xhr.method, 'POST', 'methodがPOSTになっている');
			start();
		});

		this.source.setAjaxSettings({
			type: 'POST'
		});
		this.server.respond();
	});

	asyncTest('空オブジェクトを渡す。初期設定が反映される', 1, function() {
		var regExpDefault = /application\/json/;

		this.server.respondWith(/.*/, function(xhr) {
			ok(regExpDefault.test(xhr.requestHeaders.Accept));
			start();
		});

		this.source.setAjaxSettings({});
		this.server.respond();
	});

	test('オブジェクト以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.setAjaxSettings('test');
		}, /不正な引数です/);
	});

	asyncTest('nullを渡す。初期設定が反映される', 1, function() {
		var regExpDefault = /application\/json/;

		this.server.respondWith(/.*/, function(xhr) {
			ok(regExpDefault.test(xhr.requestHeaders.Accept));
			start();
		});

		this.source.setAjaxSettings(null);
		this.server.respond();
	});


	/**
	 * setCustomRequestData
	 */
	module('LazyLoad setCustomRequestData(customRequestData) リクエストパラメータに反映されている', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);
			this.server = sinon.fakeServer.create();
			this.isMatch = function(url, argRegExp) {
				var result = url.match(argRegExp);
				return (result != null);
			};
		},
		teardown: function() {
			this.server.restore();
		},
		source: null,
		server: null,
		isMatch: null
	});

	asyncTest('マップ({a:1})を渡す', 1, function() {
		this.server.respondWith(/.*/, function(xhr) {
			ok((/a=1/).test(xhr.url));
			start();
		});

		this.source.setCustomRequestData({
			a: 1
		});
		this.server.respond();
	});

	asyncTest('マップ({b:2, c:\'test\'})を渡す', 1, function() {
		this.server.respondWith(/.*/, function(xhr) {
			ok(/b=2/.test(xhr.url) && /c=test/.test(xhr.url));
			start();
		});

		this.source.setCustomRequestData({
			b: 2,
			c: 'test'
		});
		this.server.respond();
	});

	asyncTest('空のマップを渡す', 1, function() {
		var customRequestData = {};

		this.server.respondWith(/.*/, function(xhr) {
			var regStart = /start=[0-9]{0,}/;
			var regEnd = /end=[0-9]{0,}/;
			var regTotal = /requireTotalCount=true/;

			ok(URL === xhr.url.replace(regStart, '').replace(regEnd, '').replace(regTotal, '')
					.replace(/\&+/, '').replace(/\?/, ''));
			start();
		});

		this.source.setCustomRequestData(customRequestData);
		this.server.respond();
	});

	test('マップ以外を渡す。エラーメッセージ出力', 1, function() {
		throws(function() {
			this.source.setCustomRequestData(100);
		}, /不正な引数です/);
	});


	/**
	 * sliceAsync(start,end)
	 */
	//TODO: slice()の仕様と異なる部分があります。要検討
	module('LazyLoad sliceAsync(start,end)', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);

			this.server = sinon.fakeServer.create();

			// changeSearchOptions()でリクエストを受けるfakeServer
			this.server.respondWith(URL + '?start=0&end=50&requireTotalCount=true', JSON
					.stringify(createData(2, 51)));

			// sliceAsync()でリクエストを受けるfakeServer
			this.server.respondWith(URL + '?start=0&end=50&requireTotalCount=false', JSON
					.stringify(createData(2, 51)));

			// sliceAsync()で再検索のリクエストを受けるfakeServer
			this.server.respondWith(URL + '?start=0&end=100&requireTotalCount=false', JSON
					.stringify(createData(100, 51)));
		},
		teardown: function() {
			this.server.restore();
		},
		source: null,
		server: null
	});

	asyncTest('キャッシュ範囲内を指定。start～endの範囲のデータを取得', 1, function() {
		var that = this;
		var data = createData(2, 2);// データの長さ＝2のデータを生成

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(0, 2).then(function(result) {
				deepEqual(result, data.list, '境界値の内側');
				start();
			});

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('キャッシュ範囲外を指定。再検索してstart～endの範囲のデータを取得', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(0, 51).then(function(result) {
				deepEqual(result, createData(51, 51).list.slice());
				start();
			});
			that.server.respond();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('startを渡さない。0～endの範囲で取得', 1, function() {
		var that = this;
		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(null, 2).then(function(result) {
				deepEqual(result, createData(2, 2).list);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	asyncTest('endを渡さない。start～totalLengthの範囲で取得。totalLengthがキャッシュ範囲内の場合。値を取得', 1, function() {
		var that = this;
		// changeSearchOptionsのリクエストを受け取るfakeServer
		this.server.respondWith(URL + '?start=0&end=50&requireTotalCount=true', JSON
				.stringify(createData(2, 2)));

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(0).then(function(result) {
				deepEqual(result, createData(2, 2).list);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	asyncTest('endを渡さない。start～totalLengthの範囲で取得。totalLengthがキャッシュ範囲外の場合。再検索して値を取得', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(0).then(function(result) {
				deepEqual(result, createData(51, 51).list);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start,endを渡さない。0～totalLengthの範囲で取得。totalLengthがキャッシュ範囲内の場合', 1, function() {
		var that = this;
		// changeSearchOptionsのリクエストを受け取るfakeServer
		this.server.respondWith(URL + '?start=0&end=50&requireTotalCount=true', JSON
				.stringify(createData(2, 2)));

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync().then(function(result) {
				deepEqual(result, createData(2, 2).list);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start,endを指定しない。0～totalLengthの範囲で取得。totalLengthがキャッシュ範囲外の場合。再検索して値を取得', 1,
			function() {
				var that = this;

				this.source.addEventListener('changeSource', function() {
					that.source.sliceAsync().then(function(result) {
						deepEqual(result, createData(51, 51).list);
						start();
					});
					that.server.respond();

				});
				this.source.changeSearchOptions({});
				this.server.respond();
			});

	//TODO: slice()と挙動が異なる。
	asyncTest('nullを指定。0～totalLengthの範囲で取得。totalLengthがキャッシュ範囲内の場合', 1, function() {
		var that = this;
		// changeSearchOptionsのリクエストを受け取るfakeServer
		this.server.respondWith(URL + '?start=0&end=50&requireTotalCount=true', JSON
				.stringify(createData(2, 2)));

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(null, null).then(function(result) {
				deepEqual(result, createData(2, 2).list);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	asyncTest('nullを指定。0～totalLengthの範囲で取得。totalLengthがキャッシュ範囲外の場合', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(null, null).then(function(result) {
				deepEqual(result, createData(51, 51).list);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	test('数値以外を指定。エラーメッセージ出力', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			throws(function() {
				that.source.sliceAsync('test', 'test');
			}, /不正な引数です/);
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('正数の同値を指定。空配列を取得', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(1, 1).then(function(result) {
				deepEqual(result, []);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('負数の同値を指定。空配列を取得', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(-1, -1).then(function(result) {
				deepEqual(result, []);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start > endな正数を渡す。空配列を取得', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(2, 1).then(function(result) {
				deepEqual(result, []);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('負数を渡す。totalLength加算後、start＜end かつ 正数ならば値を取得', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(-2, -1).then(function(result) {
				deepEqual(result, createData(0, 1).list);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('負数を渡す。totalLength加算後、start＞end ならば空配列を取得', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(-1, -2).then(function(result) {
				deepEqual(result, []);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('負数を渡す。totalLength加算後、どちらか一方でも負数ならば空配列を取得', 1, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			that.source.sliceAsync(-3, -2).then(function(result) {
				deepEqual(result, []);
				start();
			});
			that.server.respond();

		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});


	/**
	 * sliceCachedData
	 */
	//TODO: slice()の仕様と異なる部分があります。要検討
	module('LazyLoad sliceCachedData(start,end)', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);
			this.server = sinon.fakeServer.create();
		},
		teardown: function() {
			this.server.restore();
		},
		source: null,
		server: null
	});

	asyncTest('キャッシュ範囲内を指定', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(0, 2), MULTIPLE_DATA.list, 'データの長さ＝2なので、境界値の内側');
			start();
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('endがキャッシュ範囲外を指定。エラーメッセージ出力', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			throws(function() {
				that.source.sliceCachedData(0, 3);//データの長さ＝2なので、境界値の外側
			}, /指定した範囲にキャッシュされていないデータが含まれています;/);
			start();
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('startを渡さない。0～endの範囲を指定', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(null, 2), MULTIPLE_DATA.list);
			start();
		});
		this.source.changeSearchOptions(this.filterObj);
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	asyncTest('endを渡さない。start～totalLengthの範囲を指定。totalLengthがキャッシュ範囲内。値を取得', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(0), MULTIPLE_DATA.list);
			start();
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	asyncTest('endを渡さない。start～totalLengthの範囲を指定。totalLengthがキャッシュ範囲外。エラーメッセージ出力', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(createData(2, 3)));// データの長さ＝2,totalLength＝3のデータを生成

		this.source.addEventListener('changeSource', function() {
			throws(function() {
				that.source.sliceCachedData(0);
			}, /指定した範囲にキャッシュされていないデータが含まれています/);
			start();
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start,endを渡さない。0～totalLengthの範囲を指定。totalLengthがキャッシュ範囲内。値を取得', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(), MULTIPLE_DATA.list);
			start();
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start,endを渡さない。0～totalLengthの範囲を指定。totalLengthがキャッシュ範囲外。エラーメッセージ出力', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(createData(2, 3)));

		this.source.addEventListener('changeSource', function() {
			throws(function() {
				that.source.sliceCachedData();
			}, /指定した範囲にキャッシュされていないデータが含まれています/);
			start();
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	asyncTest('nullを渡す。0～totalLengthの範囲を指定。totalLengthがキャッシュ範囲内。値を取得', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(null, null), MULTIPLE_DATA.list);
			start();
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	asyncTest('nullを渡す。0～totalLengthの範囲を指定。totalLengthがキャッシュ範囲外。エラーメッセージ出力', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(createData(2, 3)));

		this.source.addEventListener('changeSource', function() {
			throws(function() {
				that.source.sliceCachedData(null, null);
			}, /指定した範囲にキャッシュされていないデータが含まれています/);
			start();
		});
		this.source.changeSearchOptions({});
		this.server.respond();
	});

	//TODO: slice()と挙動が異なる。
	test('数値以外を渡す。エラーメッセージ出力', function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			throws(function() {
				that.source.sliceCachedData('test', 'test');
			}, /不正な引数です/);
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('同値を渡す。空配列を取得', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(1, 1), []);
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start > endの正数を渡す。空配列を取得', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(2, 0), []);
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start > endの負数を渡す。totalLength加算後、start < endの場合、値を取得', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(-2, -1), MULTIPLE_DATA.list.slice(0, 1));
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('start > endの負数を渡す。totalLength加算後、start > endの場合、空配列を取得', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(-1, -2), []);
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});


	asyncTest('負数を渡す。totalLength加算後も負数の場合、空配列を取得', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(-4, -3), []);
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});


	/**
	 * getCachedData
	 */
	module('LazyLoad getCachedData(index)', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);
			this.server = sinon.fakeServer.create();
			this.server.respondWith(/.*/, JSON.stringify(MULTIPLE_DATA));
			this.search = function() {
				this.source.changeSearchOptions({});
				this.server.respond();
			};
		},
		teardown: function() {
			this.server.restore();
		},
		source: null,
		server: null,
		search: null
	});

	asyncTest('キャッシュ範囲内を指定', 2, function() {
		var that = this;

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.getCachedData(0), MULTIPLE_DATA.list[0], '0を指定');
			deepEqual(that.source.getCachedData(1), MULTIPLE_DATA.list[1], '境界値の内側なので値を取得');
			start();
		});
		this.search();
	});

	asyncTest('キャッシュ範囲外を指定', 1, function() {
		var that = this;
		this.source.addEventListener('changeSource', function() {
			throws(function() {
				that.source.getCachedData(2);
			}, /不正な引数です/, '境界値の外側なのでエラーメッセージ出力');
			start();
		});
		this.search();
	});

	test('indexを渡さない', 1, function() {
		throws(function() {
			this.source.getCachedData();
		}, /不正な引数です/, 'エラーメッセージ出力');
	});

	test('nullを渡す', 1, function() {
		throws(function() {
			this.source.getCachedData(null);
		}, /不正な引数です/, 'エラーメッセージ出力');
	});

	test('数値以外を渡す', 1, function() {
		throws(function() {
			this.source.getCachedData("test");
		}, /不正な引数です/, 'エラーメッセージ出力');
	});

	test('負数を渡す', 1, function() {
		throws(function() {
			this.source.getCachedData(-1);
		}, /不正な引数です/, 'エラーメッセージ出力');
	});


	/**
	 * getTotalLength
	 */
	module('LazyLoad getTotalLength()', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);
			this.server = sinon.fakeServer.create();
			this.server.respondWith(/.*/, JSON.stringify(createData(2, 2)));// データの長さ＝2,totalLength＝2のデータを生成
		},
		teardown: function() {
			this.server.restore();
		},
		source: null,
		server: null
	});

	asyncTest('検索結果の総件数を取得', 1, function() {
		var that = this;
		this.source.addEventListener('changeSource', function() {
			strictEqual(that.source.getTotalLength(), 2);
			start();
		});

		this.source.changeSearchOptions({});
		this.server.respond();
	});


	/**
	 * data-sourceで通信失敗時、commonFailHandlerが起きるかチェック
	 */
	module('LazyLoad commonFailHandlerが起きるかチェック', {
		setup: function() {
			this.source = createLazyLoadDataSource(URL);
			this.server = sinon.fakeServer.create();
		},
		teardown: function() {
			h5.settings.commonFailHandler = null;
		},
		source: null,
		server: null
	});

	asyncTest('commonFailHandlerが呼ばれないテスト', 1, function() {
		var that = this;
		this.server.respondWith(/.*/, function(xhr) {
			xhr.respond(200, {}, JSON.stringify(MULTIPLE_DATA));
		});

		this.source.addEventListener('changeSource', function() {
			deepEqual(that.source.sliceCachedData(0, 2), MULTIPLE_DATA.list);
			start();
		});
		h5.settings.commonFailHandler = function() {
			ok(false, 'commonFailHandlerに設定した関数が呼ばれてしまう。このassertは実行されない。');
			start();
		};

		this.source.changeSearchOptions({});
		this.server.respond();
	});

	asyncTest('commonFailHandlerが呼ばれる', 1, function() {
		this.server.respondWith(/.*/, function(xhr) {
			xhr.respond(500, {}, '[]');// 第3引数はJSONにparseするため、それができないとエラーになる
		});
		h5.settings.commonFailHandler = function() {
			ok(true);
			start();
		};

		this.source.changeSearchOptions({});
		this.server.respond();
	});


	/**
	 * 2回createLazyLoadDataSourceを呼んだとき、設定が共有されていないかチェック
	 * <p>
	 * setterによる設定もチェックすること
	 */
	module('LazyLoad createLazyLoadDataSourcで2回生成したときの設定が共有されていないかチェック', {
		setup: function() {
			this.dispSize = 100;
			this.searchOptions = {
				filter: {
					type: 'c'
				},
				sort: [{
					property: 'value',
					order: 'asc'
				}]
			};
			this.ajaxSettings = {
				type: 'POST'
			};
			this.customRequestData = {
				a: 1
			};
			this.server = sinon.fakeServer.create();
		},
		teardown: function() {
			this.server.restore();
		},

		searchOptions: null,
		ajaxSettings: null,
		customRequestData: null,

		server: null,
		source: null
	});

	asyncTest('ajaxSettingsのチェック', function() {
		var that = this;

		this.server.respondWith(/first/, function(firstXHR) {
			that.server.respondWith(/second/, function(secondXHR) {
				notDeepEqual(firstXHR.method, secondXHR.method);
				start();
			});

			that.source = createLazyLoadDataSource('second');
			that.source.changeSearchOptions({});
			that.server.respond();
		});

		this.source = createLazyLoadDataSource('first');
		this.source.setAjaxSettings(this.ajaxSettings);// ajaxSettingsを設定
		this.server.respond();
	});

	asyncTest('customRequestDataのチェック', function() {
		var that = this;

		this.server.respondWith(/first/, function() {
			that.server.respondWith(/second/, function(secondXHR) {
				ok(!(/a=1/.test(secondXHR.url)));
				start();
			});

			that.source = createLazyLoadDataSource('second');
			that.source.changeSearchOptions({});
			that.server.respond();
		});

		this.source = createLazyLoadDataSource('first');
		this.source.setCustomRequestData(this.setCustomRequestData);// customRequestDataを設定
		this.server.respond();
	});

	asyncTest('searchOptionsのチェック', function() {
		var that = this;

		this.server.respondWith(/first/, function() {
			that.server.respondWith(/second/, function(secondXHR) {
				ok(!(/type=c/.test(secondXHR.url)), 'フィルタが共有されていない');
				ok(!(/sortKey=value/.test(secondXHR.url)), 'ソートキーが共有されていない');
				ok(!(/sortOrder=asc/.test(secondXHR.url)), 'ソート順が共有されていない');
				start();
			});

			that.source = createLazyLoadDataSource('second');
			that.source.changeSearchOptions({});
			that.server.respond();
		});

		this.source = createLazyLoadDataSource('first');
		this.source.changeSearchOptions(this.searchOptions);// searchOptionsを設定
		this.server.respond();
	});


	/**
	 * 2回createLazyLoadDataSourceを呼んだとき、キャッシュが共有されていないかチェック
	 * <p>
	 * setterによる設定もチェックすること
	 */
	module('LazyLoad createLazyLoadDataSourcで2回生成したとき、キャッシュが共有されていないかチェック', {
		setup: function() {
			this.server = sinon.fakeServer.create();
		},
		teardown: function() {
			this.server.restore();
		},
		server: null,
		source: null
	});

	asyncTest('キャッシュが共有されていないかチェック', function() {
		var that = this;
		var firstData = null;

		this.server.respondWith(/first/, function(firstXHR) {
			firstXHR.respond(200, {}, JSON.stringify(createData(1, 1)));
			that.source.sliceAsync().then(function(data) {
				firstData = data;
				that.source = createLazyLoadDataSource('second');
				that.source.changeSearchOptions({});
				that.server.respond();

			});
		});

		that.server.respondWith(/second/, function(xhr) {
			xhr.respond(200, {}, JSON.stringify(createData(2, 2)));
			that.source.sliceAsync().then(function(secondData) {
				notDeepEqual(firstData, secondData);
				start();

			});
		});

		this.source = createLazyLoadDataSource('first');
		this.source.changeSearchOptions({});
		this.server.respond();
	});

})();

// JSCoverのレポート自動保存のための記述
if (window.jscoverage_report) {
	jscoverage_report();
}
