/*
 * Copyright (C) 2014-2016 NS Solutions Corporation
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

/* ------ h5.ui.components.datagrid.util ------ */

// ----- Base Utility ----- //
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.util';

	/**
	 * @name util
	 * @memberOf h5.ui.components.datagrid
	 * @namespace
	 */
	h5.u.obj.ns(NAMESPACE);


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	var OBJECT_TYPE_REGEXP = /\[object ([^\]]*)\]/;
	var FUNCTION_NAME_REGEXP = /^\s*function\s*([^\(\s]*)/im;

	var TO_VERBOSE_STRING_DEFAULT_DEPTH = 0;
	var FORMAT_VERBOSE_DEPTH = 1;


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var objectProto = Object.prototype;

	var format = h5.u.str.format;
	var argsToArray = h5.u.obj.argsToArray;


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Functions
	//=============================

	// ---- Arguments Check ---- //

	/**
	 * @private
	 * @param {string} name
	 * @param {*} value
	 */
	function requireNumber(name, value) {
		if (typeof value !== 'number') {
			var msg = format('{0} は数値である必要があります; {0}={1}', name, value);
			throw new TypeError(msg);
		}
	}

	/**
	 * @private
	 * @param {string} name
	 * @param {*} value
	 */
	function requireFunction(name, value) {
		if (!$.isFunction(value)) {
			var msg = format('{0} は関数である必要があります; {0}={1}', name, value);
			throw new TypeError(msg);
		}
	}


	// ---- Type Utility ---- //

	/**
	 * Object の Type を返します。
	 * <p>
	 * 具体的には Object#toString() の結果の [object {TYPE}] の {TYPE} 部分を返します。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Object} value 値
	 * @returns {string} Object の Type
	 */
	function objectTypeOf(value) {
		var str = objectProto.toString.call(value);
		return OBJECT_TYPE_REGEXP.exec(str)[1];
	}

	/**
	 * RegExp オブジェクトであるか判定します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {*} value 値
	 * @returns {boolean} RegExp オブジェクトであれば true、そうでなければ false
	 */
	function isRegExp(value) {
		return objectTypeOf(value) === 'RegExp';
	}

	/**
	 * Date オブジェクトであるか判定します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {*} value 値
	 * @returns {boolean} Date オブジェクトであれば true、そうでなければ false
	 */
	function isDate(value) {
		return objectTypeOf(value) === 'Date';
	}

	/**
	 * Error オブジェクトであるか判定します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {*} value 値
	 * @returns {boolean} Error オブジェクトであれば true、そうでなければ false
	 */
	function isError(value) {
		return objectTypeOf(value) === 'Error';
	}

	/**
	 * プレーンなオブジェクトであるか判定します。
	 * <p>
	 * jQuery の $.isPlainObject() では constructor という名前のプロパティを持つオブジェクトを正しく判定できないために作成したメソッドです。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {*} value 値
	 * @returns {boolean} プレーンなオブジェクトであれば true、そうでなければ false
	 */
	function isPlainObject(value) {
		if (value == null) {
			return false;
		}
		if (typeof value !== 'object') {
			return false;
		}
		if (objectTypeOf(value) !== 'Object') {
			return false;
		}

		if ($.isFunction(Object.getPrototypeOf)) {
			return Object.getPrototypeOf(value) === objectProto;
		}

		if (!hasProperty(value, 'constructor')) {
			var C = value.constructor;
			if ($.isFunction(C) && C !== Object) {
				return false;
			}
		}

		return every(value, function(v, k) {
			return hasProperty(value, k);
		});
	}


	// ---- Collection Utility ---- //

	/**
	 * @typedef {Object|Array} Collection
	 * @memberOf h5.ui.components.datagrid.util
	 */

	/**
	 * collection の各要素に対して callback の処理を実行します。
	 * <p>
	 * callback の引数の順が逆になっていること、null や undefined を渡してもエラーとならないことが、 $.each() と異なります。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Collection} collection コレクション
	 * @param {function(*, *)} iteratee 実行する処理
	 */
	function forEach(collection, iteratee) {
		if (collection == null) {
			return;
		}

		$.each(collection, function(i, v) {
			return iteratee(v, i);
		});
	}

	/**
	 * collection の各要素に callback を適用した結果の配列を返します。
	 * <p>
	 * null や undefined を渡してもエラーとならないことが、 $.map() と異なります。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Collection} collection コレクション
	 * @param {function(*, *): *} iteratee 各要素に適用する関数
	 * @returns {Array.<*>} 結果の配列
	 */
	function map(collection, iteratee) {
		if (collection == null) {
			return [];
		}

		var result = [];
		forEach(collection, function(value, key) {
			result.push(iteratee(value, key));
		});

		return result;
	}


	/**
	 * すべての要素が条件を満たすか確認します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Collection} collection コレクション
	 * @param {function(*, *): boolean} predicate 要素を引数として受け取り boolean を返す関数
	 * @returns {boolean} すべての要素に対して callback が true を返したら true、そうでなければ false
	 */
	function every(collection, predicate) {
		var result = true;

		if (collection == null) {
			return result;
		}

		forEach(collection, function(value, key) {
			if (!predicate(value, key)) {
				result = false;
				return false;
			}
		});

		return result;
	}

	/**
	 * 要素がひとつでも条件を満たすか確認します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Collection} collection コレクション
	 * @param {function(*, *): boolean} predicate 要素を引数として受け取り boolean を返す関数
	 * @returns {boolean} 要素のうち、ひとつでも callback が true を返したら true、そうでなければ false
	 */
	function some(collection, predicate) {
		var result = false;

		if (collection == null) {
			return result;
		}

		forEach(collection, function(value, key) {
			if (predicate(value, key)) {
				result = true;
				return false;
			}
		});

		return result;
	}


	// ---- Function Utility ---- //

	/**
	 * this に context をバインドした関数を返します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {context} context this にバインドする値
	 * @param {Function} bindFunction 関数
	 * @returns {Function} this に context をバインドした関数
	 */
	function bindThis(context, bindFunction) {
		requireFunction('bindFunction', bindFunction);

		return function(/* var_args */) {
			return bindFunction.apply(context, arguments);
		};
	}

	/**
	 * 関数の名前を返します。
	 * <p>
	 * 関数以外のものが渡されたり、名前がわからなかった場合は空文字列を返します。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Function} f
	 * @returns {string} 関数の名前
	 */
	function functionName(f) {
		if (!$.isFunction(f)) {
			return '';
		}
		if (f.name != null) {
			return f.name;
		}

		var match = FUNCTION_NAME_REGEXP.exec(f.toString());
		if (!match) {
			return '';
		}

		return match[1];
	}


	// ---- String Utility ---- //

	/**
	 * クラス名を返します。 判定できなかった場合は Object が返ります。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {*} target 変換する値
	 * @returns {string} クラス名
	 */
	function className(target) {
		var objectType = objectTypeOf(target);

		if (objectType !== 'Object') {
			return objectType;
		}

		if (typeof target.__name === 'string') {
			return target.__name;
		}
		if (!$.isFunction(target.constructor)) {
			return 'Object';
		}

		var constructorName = functionName(target.constructor);
		if (constructorName === '') {
			return 'Object';
		}

		return constructorName;
	}

	/**
	 * 値を詳細な情報を含む文字列表現に変換します。 この際 string であればダブルクォートで囲み、オブジェクトであればそのプロパティの値も文字列変換されます。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {*} target 変換する値
	 * @param {number=} [depth=0] プロパティを展開する深さ（デフォルトは 0 でトップだけを展開）
	 * @returns {string} オブジェクトの詳細な文字列表現
	 */
	function toVerboseString(target, depth) {
		var _depth = (depth == null) ? TO_VERBOSE_STRING_DEFAULT_DEPTH : depth;
		requireNumber('depth', _depth);

		if (target == null) {
			return String(target);
		}

		var type = typeof target;
		if (type === 'string') {
			return '"' + target.replace('"', '\\"') + '"';
		}
		if (type === 'function') {
			var funcName = functionName(target);
			if (funcName === '') {
				return '[function]';
			}
			return '[function ' + funcName + ']';
		}
		if (type !== 'object') {
			return String(target);
		}
		if (_depth < 0) {
			// toString が関数以外の値で上書きされていた場合は '#{CLASSNAME}#' を返す
			if (!$.isFunction(target.toString)) {
				return '#' + className(target) + '#';
			}

			// Object の場合は toString() でこのメソッドを使っていたりするとループになるので打ち切る
			if (objectTypeOf(target) === 'Object') {
				return '#' + className(target) + '#';
			}
			return String(target);
		}

		if ($.isArray(target)) {
			var strArray = $.map(target, function(value) {
				return toVerboseString(value, _depth - 1);
			});

			return '[' + strArray.join(', ') + ']';
		}

		var name = className(target);

		var properties = [];
		for ( var key in target) {
			if (!hasProperty(target, key)) {
				continue;
			}

			var value = target[key];
			properties.push(key + ':' + toVerboseString(value, _depth - 1));
		}

		return name + '{' + properties.join(', ') + '}';
	}

	/**
	 * デフォルトの toString() となっている object と配列に対し、 toVerboseString() を実行する h5.u.str.format() 関数です。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {string} pattern パターン文字列
	 * @param {...*} [var_args] パターンに渡す値（可変長引数）
	 * @returns {string} フォーマット済み文字列
	 */
	function formatVerbose(pattern /* , var_args */) {
		var args = argsToArray(arguments);
		var patternArgs = args.slice(1);

		var formatArgs = map(patternArgs, function(value) {
			if (value == null) {
				return String(value);
			}
			if (typeof value !== 'object') {
				return String(value);
			}
			if ($.isArray(value)) {
				return toVerboseString(value, FORMAT_VERBOSE_DEPTH);
			}
			if (value.toString !== objectProto.toString && $.isFunction(value.toString)) {
				return String(value);
			}

			return toVerboseString(value, FORMAT_VERBOSE_DEPTH);
		});

		formatArgs.unshift(pattern);

		return format.apply(null, formatArgs);
	}


	// ---- Object Utility ---- //

	/**
	 * 指定した名前のプロパティをオブジェクトが持っているか判定します。
	 * <p>
	 * Object#hasOwnProperty と同じですが、こちらは hasOwnProperty という名前のプロパティを持っている場合でも利用できます。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Object} obj
	 * @param {string} name
	 */
	function hasProperty(obj, name) {
		return objectProto.hasOwnProperty.call(obj, name);
	}


	//=============================
	// Variables
	//=============================


	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	//=============================
	// （クラス名）
	//=============================


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	var exports = {

		objectTypeOf: objectTypeOf,
		isRegExp: isRegExp,
		isDate: isDate,
		isError: isError,
		isPlainObject: isPlainObject,

		forEach: forEach,
		map: map,
		every: every,
		some: some,

		bindThis: bindThis,
		functionName: functionName,

		className: className,
		toVerboseString: toVerboseString,
		formatVerbose: formatVerbose,

		hasProperty: hasProperty
	};


	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);

})(jQuery);


// ----- Validate Utility ----- //
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.util.validator';

	/**
	 * @name validator
	 * @memberOf h5.ui.components.datagrid.util
	 * @namespace
	 */
	h5.u.obj.ns(NAMESPACE);


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	var SETTING_NAMESPACE = NAMESPACE + '.setting';


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var argsToArray = h5.u.obj.argsToArray;
	var isJQueryObject = h5.u.obj.isJQueryObject;

	var util = h5.ui.components.datagrid.util;
	var format = util.formatVerbose;

	var log = h5.log.createLogger(NAMESPACE);


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Functions
	//=============================

	/**
	 * @private
	 * @param {string} name
	 * @param {*} value
	 */
	function requireString(name, value) {
		if (typeof value !== 'string') {
			var msg = format('{0} は string 型である必要があります; {0}={1}', name, value);
			throw new TypeError(msg);
		}
	}

	/**
	 * @private
	 * @param {string} name
	 * @param {*} value
	 */
	function requireNumber(name, value) {
		if (typeof value !== 'number') {
			var msg = format('{0} は number 型である必要があります; {0}={1}', name, value);
			throw new TypeError(msg);
		}
	}

	/**
	 * @private
	 * @param {string} name
	 * @param {*} value
	 */
	function requireIndex(name, value) {
		var msg = format('{0} は 0 以上の整数である必要があります; {0}={1}', name, value);
		if (typeof value !== 'number') {
			throw new TypeError(msg);
		}
		if (parseInt(value, 10) !== value) {
			throw new TypeError(msg);
		}
		if (value < 0) {
			throw new TypeError(msg);
		}
	}

	/**
	 * @private
	 * @param {string} name
	 * @param {*} value
	 */
	function requireFunction(name, value) {
		if (!$.isFunction(value)) {
			var msg = format('{0} は関数である必要があります; {0}={1}', name, value);
			throw new TypeError(msg);
		}
	}

	/**
	 * @private
	 * @param {string} name
	 * @param {*} value
	 */
	function requireRegExp(name, value) {
		if (!util.isRegExp(value)) {
			var msg = format('{0} は RegExp である必要があります; {0}={1}', name, value);
			throw new TypeError(msg);
		}
	}

	/**
	 * @private
	 * @param {string} name
	 * @param {*} value
	 */
	function requireArray(name, value) {
		if (!$.isArray(value)) {
			var msg = format('{0} は配列である必要があります; {0}={1}', name, value);
			throw new TypeError(msg);
		}
	}

	function requireRegExpArray(nama, value) {
		var msg = format('{0} は RegExp の配列である必要があります; {0}={1}', name, value);
		if (!$.isArray(value)) {
			throw new TypeError(msg);
		}

		var allRegExp = util.every(value, function(elem) {
			return util.isRegExp(elem);
		});

		if (!allRegExp) {
			throw new TypeError(msg);
		}
	}


	// ---- Validator Utility ---- //

	/**
	 * @private
	 * @param {ValidateResult} results
	 * @param {string} indent
	 */
	function validateResultsToString(results, indent) {
		var str = '';

		for (var i = 0, len = results.length; i < len; i++) {
			var result = results[i];

			str += '\n';
			str += indent;

			if (result.validation === 'or') {

				str += '次の条件のいずれかを満たす必要があります: ';
				str += result.isValid ? 'OK' : 'NG';
				str += validateResultsToString(result.args, indent + '  ');

			} else if (result.validation === 'and') {

				str += '次の条件のすべてを満たす必要があります: ';
				str += result.isValid ? 'OK' : 'NG';
				str += validateResultsToString(result.args, indent + '  ');

			} else if (result.validation === 'check') {

				str += result.checkName;
				str += ' の条件を満たす必要があります: ';
				str += result.isValid ? 'OK' : 'NG';
				str += '; ';
				str += format('{0}={1}', result.path, result.value);
				str += validateResultsToString(result.args, indent + '  ');

			} else if (result.validation === 'keys') {

				str += result.path;
				str += ' の各キーの検証 ... ';

				if (result.isValid) {
					str += 'OK';
				} else {
					str += 'NG; ';
					str += format('{0}={1}', result.invalidPath, result.invalidValue);
					str += validateResultsToString(result.args, indent + '  ');
				}

			} else if (result.validation === 'values') {

				str += result.path;
				str += ' の各値の検証 ... ';

				if (result.isValid) {
					str += 'OK';
				} else {
					str += 'NG; ';
					str += format('{0}={1}', result.invalidPath, result.invalidValue);
					str += validateResultsToString(result.args, indent + '  ');
				}

			} else {

				str += result.path;
				str += ' は ';
				str += result.describe;
				str += ' ... ';

				if (result.isValid) {
					str += 'OK';
				} else {
					str += 'NG; ';
					str += format('{0}={1}', result.path, result.target);
				}
			}
		}

		return str;
	}

	/**
	 * @private
	 * @param {string} category
	 * @returns {boolean}
	 */
	function isSkipValidate(category) {
		if (util.hasProperty(categoryCache, category)) {
			return categoryCache[category];
		}

		var isInclude = util.some(validateIncludes, function(include) {
			return include.test(category);
		});

		if (!isInclude) {
			categoryCache[category] = true;
			return true;
		}


		var result = !util.every(validateExcludes, function(exclude) {
			return !exclude.test(category);
		});

		categoryCache[category] = result;
		return result;
	}

	/**
	 * @private
	 * @param {string} name
	 * @param {*} value
	 * @param {function(ValidationContext)} validate
	 * @returns {{isValid: boolean, results: Array.<ValidateResult>}}
	 */
	function runValidation(name, value, validate) {
		var results = [];
		var validator = new ValidationContext(name, value, results);

		try {
			validate(validator);
		} catch (e) {
			log.debug('Validation Throw Error');
			log.debug(e);
			throw e;
		}

		var isValid = util.every(results, function(result) {
			return result.isValid;
		});

		return {
			isValid: isValid,
			results: results
		};
	}

	/**
	 * Validator の設定を読み込みます。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util.validator
	 */
	function configure() {
		var setting = h5.u.obj.ns(SETTING_NAMESPACE);

		categoryCache = {};


		if (setting.includes == null) {
			validateIncludes = [/^h5\.ui\.components\.datagrid.*:user$/];
		} else {
			requireRegExpArray('includes', setting.includes);
			validateIncludes = setting.includes;
		}

		if (setting.excludes == null) {
			validateExcludes = [];
		} else {
			requireRegExpArray('excludes', setting.excludes);
			validateExcludes = setting.excludes;
		}
	}

	/**
	 * 汎用の検証用オブジェクトを作成します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util.validator
	 * @param {string} category 検証のカテゴリ
	 * @returns {Validator} 引数の検証用オブジェクト
	 */
	function createValidator(category) {
		return new Validator(category);
	}

	/**
	 * 引数の検証用オブジェクトを作成します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util.validator
	 * @param {string} category 検証のカテゴリ
	 * @returns {ArgumentsValidator} 引数の検証用オブジェクト
	 */
	function createArgumentsValidator(category) {
		return new ArgumentsValidator(category);
	}


	//=============================
	// Variables
	//=============================

	// ---- Arguments Validator Setting --- //

	var validateIncludes = [];
	var validateExcludes = [];

	var categoryCache = {};


	// ---- Validation Definition ---- //

	/** @lends ValidationContext# */
	var validationDefinition = {

		// MEMO: controller, logic, dataModel, dataItem もやりたい

		/**
		 * 値がある（null または undefined でない）ことを検証します。
		 *
		 * @method
		 */
		notNull: {
			pattern: '値がある',
			validate: function() {
				return this.target != null;
			}
		},

		/**
		 * undefined でないことを検証します。
		 *
		 * @method
		 */
		notUndefined: {
			pattern: 'undefined でない',
			validate: function() {
				return typeof this.target !== 'undefined';
			}
		},

		/**
		 * 指定した値と等しい値であるか検証します。
		 *
		 * @method
		 * @param {*} arg 等しいか確認する値
		 */
		equal: {
			pattern: '{0} である',
			validate: function(arg) {
				return this.target === arg;
			}
		},

		/**
		 * 指定した値と等しくない値であるか検証します。
		 *
		 * @method
		 * @param {*} arg 等しくないか確認する値
		 */
		notEqual: {
			pattern: '{0} でない',
			validate: function(arg) {
				return this.target !== arg;
			}
		},

		/**
		 * typeof によって検証します。
		 *
		 * @method
		 * @param {string} type タイプ
		 */
		type: {
			pattern: 'type が {0} である',
			validate: function(type) {
				requireString('type', type);
				return typeof this.target === type;
			}
		},

		/**
		 * instanceof によって検証します。
		 *
		 * @method
		 * @param {function(new)} constructor コンストラクタ
		 */
		instanceOf: {
			pattern: 'instanceof {0} である',
			validate: function(constructor) {
				requireFunction('constructor', constructor);
				return this.target instanceof constructor;
			}
		},

		/**
		 * 整数であるか検証します。
		 *
		 * @method
		 */
		integer: {
			pattern: '整数である',
			validate: function() {
				// Math.floor() だと  Infinity を弾く必要がある
				return parseInt(this.target, 10) === this.target;
			}
		},
		/**
		 * 正の数であるか検証します。
		 *
		 * @method
		 */
		positiveNumber: {
			pattern: '正の数である',
			validate: function() {
				return 0 < this.target;
			}
		},

		/**
		 * 負の数であるか検証します。
		 *
		 * @method
		 */
		negativeNumber: {
			pattern: '負の数である',
			validate: function() {
				return this.target < 0;
			}
		},

		/**
		 * 指定した値以上の数値であるか検証します。
		 *
		 * @method
		 * @param {number} number 基準とする値
		 */
		min: {
			pattern: '{0} 以上の数である',
			validate: function(number) {
				requireNumber('number', number);
				return number <= this.target;
			}
		},

		/**
		 * 指定した値以下の数値であるか検証します。
		 *
		 * @method
		 */
		max: {
			pattern: '{0} 以下の数である',
			validate: function(number) {
				requireNumber('number', number);
				return this.target <= number;
			}
		},

		/**
		 * 指定した値を越える数値であるか検証します。
		 *
		 * @method
		 * @param {number} number 基準とする値
		 */
		greaterThan: {
			pattern: '{0} を越える数である',
			validate: function(number) {
				requireNumber('number', number);
				return number < this.target;
			}
		},

		/**
		 * 指定した値未満の数値であるか検証します。
		 *
		 * @method
		 * @param {number} number 基準とする値
		 */
		lessThan: {
			pattern: '{0} 未満の数である',
			validate: function(number) {
				requireNumber('number', number);
				return this.target < number;
			}
		},

		/**
		 * 有限の値であるか検証します。
		 *
		 * @method
		 */
		finite: {
			pattern: '有限の値である',
			validate: function() {
				return isFinite(this.target);
			}
		},

		/**
		 * NaN であるか検証します。
		 * <p>
		 * equal では NaN であることを判定できないために用意された検証です。
		 * </p>
		 *
		 * @method
		 */
		isNaN: {
			pattern: 'NaN である',
			validate: function() {
				return isNaN(this.target);
			}
		},

		/**
		 * NaN 以外の値であるか検証します。
		 *
		 * @method
		 */
		notNaN: {
			pattern: 'NaN 以外の値である',
			validate: function() {
				return !isNaN(this.target);
			}
		},

		/**
		 * 指定した正規表現にマッチする値であるか検証する。
		 *
		 * @method
		 * @param {RegExp} regexp 正規表現
		 */
		match: {
			pattern: '正規表現 {0} にマッチする値である',
			validate: function(regexp) {
				requireRegExp('regexp', regexp);
				return regexp.test(this.target);
			}
		},

		/**
		 * 配列であるか検証します。
		 *
		 * @method
		 */
		array: {
			pattern: '配列である',
			validate: function() {
				return $.isArray(this.target);
			}
		},

		/**
		 * 関数であるか検証します。
		 *
		 * @method
		 */
		func: {
			pattern: '関数である',
			validate: function() {
				return $.isFunction(this.target);
			}
		},

		/**
		 * RegExp であるか検証します。
		 *
		 * @method
		 */
		regexp: {
			pattern: 'RegExp である',
			validate: function() {
				return util.isRegExp(this.target);
			}
		},

		/**
		 * Date であるか検証します。
		 *
		 * @method
		 */
		date: {
			pattern: 'Date である',
			validate: function() {
				return util.isDate(this.target);
			}
		},

		/**
		 * Error であるか検証します。
		 *
		 * @method
		 */
		error: {
			pattern: 'Error である',
			validate: function() {
				return util.isError(this.target);
			}
		},

		/**
		 * プレーンオブジェクトであるか検証します。
		 *
		 * @method
		 */
		plainObject: {
			pattern: 'プレーンオブジェクトである',
			validate: function() {
				return util.isPlainObject(this.target);
			}
		},

		/**
		 * jQuery オブジェクトであるか検証します。
		 *
		 * @method
		 */
		jQueryObject: {
			pattern: 'jQuery オブジェクトである',
			validate: function() {
				return isJQueryObject(this.target);
			}
		},

		/**
		 * 指定した名前のメソッドを持っているか検証します。
		 *
		 * @method
		 * @param {string} name メソッド名
		 */
		hasMethod: {
			pattern: '{0}() メソッドを持っている',
			validate: function(name) {
				requireString('name', name);
				return $.isFunction(this.target[name]);
			}
		},

		/**
		 * 指定した Mixin のインタフェースを持っているか検証します。
		 *
		 * @method
		 * @param {Mixin} mixin ミックスイン
		 */
		mixin: {
			pattern: '指定した Mixin のインタフェース を持っている',
			validate: function(mixin) {
				return mixin.hasInterface(this.target);
			}
		},

		/**
		 * EventDispatcher のインターフェイースを持っているか検証します。
		 *
		 * @method
		 */
		eventDispatcher: {
			pattern: 'EventDispatcher のインタフェースを持っている',
			validate: function() {
				return h5.mixin.eventDispatcher.hasInterface(this.target);
			}
		},

		/**
		 * ObservableItem であるかを検証します。
		 *
		 * @method
		 */
		observableItem: {
			pattern: 'ObservableItem である',
			validate: function() {
				return h5.core.data.isObservableItem(this.target);
			}
		},

		/**
		 * ObservableArray であるかを検証します。
		 *
		 * @method
		 */
		observableArray: {
			pattern: 'ObservableArray である',
			validate: function() {
				return h5.core.data.isObservableArray(this.target);
			}
		},


		/**
		 * 指定した配列のどれかの値であることを検証します。
		 *
		 * @method
		 * @param {Array} values 取り得る値の配列
		 */
		any: {
			pattern: '[{0}] のどれかの値である',
			validate: function(values) {
				requireArray('values', values);

				return util.some(values, util.bindThis(this, function(value) {
					return this.target === value;
				}));
			}
		},

		/**
		 * 指定した抽象メソッド群を実装していることを検証します。
		 *
		 * @method
		 * @param {AbstractMethodSet} abstractMethodSet 抽象メソッド群
		 */
		implement: {
			pattern: '{0} の抽象メソッド {1} を実装している',
			validate: function(abstractMethodSet) {
				if (!$.isFunction(abstractMethodSet.findNotImplementMethod)) {
					throw new Error('abstractMethodSet の型が正しくありません');
				}

				var notImplementMethod = abstractMethodSet.findNotImplementMethod(this.target);
				if (notImplementMethod == null) {
					return true;
				}
				this.args.push(notImplementMethod);
				return false;
			}
		},

		/**
		 * 検証用の関数を指定して検証します。
		 *
		 * @method
		 * @param {string} describe 検証を説明する文字列
		 * @param {function(*): boolean} validateFuncion 検証用関数
		 */
		validate: {
			pattern: '{0}',
			validate: function(describe, validateFunction) {
				requireString('describe', describe);
				requireFunction('validateFunction', validateFunction);
				return validateFunction(this.target);
			}
		}
	};


	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	//=============================
	// ValidationContext
	//=============================

	/**
	 * @typedef {Object} ValidateResult
	 * @memberOf ValidationContext
	 * @property {string} validation 検証の名前
	 * @property {string} path 検証した値のパス
	 * @property {*} target 検証した値
	 * @property {Array.<*>} args 検証の引数
	 * @property {boolean} isValid 検証にパスしたら true、そうでなければ false
	 * @property {string} [describe] 検証内容の説明
	 * @property {*} [invalidPath] 不正であったパス（values、keys のみ）
	 * @property {*} [invalidValue] 不正な値（values、keys のみ）
	 */

	/**
	 * このコンストラクタはユーザが直接呼び出すことはありません。
	 *
	 * @constructor ValidationContext
	 * @class 検証のコンテキストを表現するクラスです。
	 * @param {string} targetPath 検証するターゲットのパス
	 * @param {*} target 検証するターゲット
	 * @param {Array.<ValidateResult>} results 検証結果を格納する配列
	 */
	function ValidationContext(targetPath, target, results) {
		this._targetPath = targetPath;
		this._target = target;
		this._results = results;

		this._skipValidate = false;
	}

	/** @lends ValidationContext# */
	var validationContextMethods = {

		/**
		 * null または undefined を許可します。
		 * <p>
		 * もし値が null または undefined であった場合は以降の検証はスキップします。
		 * </p>
		 *
		 * @param {boolean} [denyUndefined=false] undefined を拒否するか
		 */
		nullable: function(denyUndefined) {
			if (this._target != null) {
				return;
			}
			if (this._target !== null && denyUndefined) {
				return;
			}

			this._skipValidate = true;
			this._results.push({
				validation: 'nullable',
				path: this._targetPath,
				target: this._target,
				args: [],
				isValid: true,
				describe: '値がなくても良い'
			});
		},

		/**
		 * 指定したプロパティの値を検証します。
		 *
		 * @param {string} propertyName 検証するプロパティの名前
		 * @param {function(ValidationContext)} validateProperty 検証が定義された関数
		 */
		property: function(propertyName, validateProperty) {
			requireString('propertyName', propertyName);
			requireFunction('validateProperty', validateProperty);

			if (this._skipValidate) {
				return;
			}
			if (this._target == null) {
				return;
			}


			var propertyPath;
			if ((/[a-z][a-z0-9]*/i).test(propertyName)) {
				propertyPath = format('{0}.{1}', this._targetPath, propertyName);
			} else {
				propertyPath = format('{0}["{1}"]', this._targetPath, propertyName);
			}

			var property = this._target[propertyName];

			var validator = new ValidationContext(propertyPath, property, this._results);
			validateProperty(validator);
		},

		/**
		 * 指定したインデックスの値を検証します。
		 *
		 * @param {number} index 検証するインデックス（整数）
		 * @param {function(ValidationContext)} validateValue 検証が定義された関数
		 */
		index: function(index, validateValue) {
			requireIndex('index', index);
			requireFunction('validateValue', validateValue);

			if (this._skipValidate) {
				return;
			}


			var indexPath = format('{0}[{1}]', this._targetPath, index);
			var value = this._target[index];

			var validator = new ValidationContext(indexPath, value, this._results);
			validateValue(validator);
		},

		/**
		 * 各キーの値を検証します。
		 *
		 * @param {function(ValidationContext)} validateKey 検証が定義された関数
		 */
		keys: function(validateKey) {
			requireFunction('validateKey', validateKey);

			if (this._skipValidate) {
				return;
			}

			var keys = [];
			for ( var key in this._target) {
				if (util.hasProperty(this._target, key)) {
					keys.push(key);
				}
			}

			var keysResult = {
				validation: 'keys',
				path: this._targetPath,
				target: this._target,
				args: [],
				isValid: true,
				invalidPath: null,
				invalidValue: null
			};

			util.forEach(keys, util.bindThis(this, function(key, i) {
				var keyPath = format('keys({0})[{1}]', this._targetPath, i);
				var results = [];

				var validator = new ValidationContext(keyPath, key, results);
				validateKey(validator);

				var isValid = util.every(results, function(result) {
					return result.isValid;
				});

				if (!isValid) {
					keysResult.args = results;
					keysResult.isValid = false;
					keysResult.invalidPath = keyPath;
					keysResult.invalidValue = key;
					return false;
				}
			}));

			this._results.push(keysResult);
		},

		/**
		 * 各値を検証します。
		 *
		 * @param {function(ValidationContext)} validateKey 検証が定義された関数
		 */
		values: function(validateValue) {
			requireFunction('validateValue', validateValue);

			if (this._skipValidate) {
				return;
			}

			var valuesResult = {
				validation: 'values',
				path: this._targetPath,
				target: this._target,
				args: [],
				isValid: true,
				invalidPath: null,
				invalidValue: null
			};

			util.forEach(this._target, util.bindThis(this, function(value, key) {
				var valuePath = format('{0}[1]', this._targetPath, util.toVerboseString(key));
				var results = [];

				var validator = new ValidationContext(valuePath, value, results);
				validateValue(validator);

				var isValid = util.every(results, function(result) {
					return result.isValid;
				});

				if (!isValid) {
					valuesResult.args = results;
					valuesResult.isValid = false;
					valuesResult.invalidPath = valuePath;
					valuesResult.invalidValue = value;
					return false;
				}
			}));

			this._results.push(valuesResult);
		},

		/**
		 * or 条件で検証します。
		 *
		 * @param {function(ValidationContext)} validate 検証が定義された関数
		 */
		or: function(validate) {
			requireFunction('validate', validate);

			if (this._skipValidate) {
				return;
			}


			var results = [];
			var context = new ValidationContext(this._targetPath, this._target, results);
			validate(context);

			var isValid = util.some(results, function(result) {
				return result.isValid;
			});

			this._results.push({
				validation: 'or',
				args: results,
				isValid: isValid
			});
		},

		/**
		 * and 条件で検証します。
		 *
		 * @param {function(ValidationContext)} validate 検証が定義された関数
		 */
		and: function(validate) {
			requireFunction('validate', validate);

			if (this._skipValidate) {
				return;
			}


			var results = [];
			var context = new ValidationContext(this._targetPath, this._target, results);
			validate(context);

			var isValid = util.every(results, function(result) {
				return result.isValid;
			});

			this._results.push({
				validation: 'and',
				args: results,
				isValid: isValid
			});
		},

		/**
		 * 一連の検証を名前を付けて実行します。
		 * <p>
		 * 出力結果に名前が付く以外は and と同じです。
		 * </p>
		 */
		check: function(name, validate) {
			requireString('name', name);
			requireFunction('validate', validate);

			if (this._skipValidate) {
				return;
			}

			var results = [];
			var context = new ValidationContext(this._targetPath, this._target, results);
			validate(context);

			var isValid = util.every(results, function(result) {
				return result.isValid;
			});

			this._results.push({
				validation: 'check',
				checkName: name,
				args: results,
				isValid: isValid,
				path: this._targetPath,
				value: this._target
			});
		}
	};

	// 各種 validate メソッドの登録
	util.forEach(validationDefinition, function(definition, name) {
		validationContextMethods[name] = function(/* var_args */) {
			if (this._skipValidate) {
				return;
			}

			var args = argsToArray(arguments);
			var context = {
				target: this._target,
				args: args
			};

			var ok;
			try {
				ok = definition.validate.apply(context, args);
			} catch (e) {
				log.debug('Validation [{0}] throw Error', name);
				log.debug(e);
				ok = false;
			}

			var formatArgs = context.args;
			formatArgs.unshift(definition.pattern);
			var describe = format.apply(null, formatArgs);

			this._results.push({
				validation: name,
				path: this._targetPath,
				target: this._target,
				args: args,
				isValid: ok,
				describe: describe
			});
		};
	});

	$.extend(ValidationContext.prototype, validationContextMethods);


	//=============================
	// Validator
	//=============================

	/**
	 * このコンストラクタはユーザが直接呼び出すことはありません。
	 *
	 * @class 検証を行うためのクラスです
	 * @constructor Validator
	 * @param {string} category
	 */
	function Validator(category) {
		requireString('category', category);

		this._category = category;
	}

	/** @lends Validator# */
	var validatorDefinition = {

		// --- Metadata --- //

		/**
		 * Eclipse のアウトライン用のコメントです。
		 *
		 * @private
		 * @memberOf _Validator
		 */
		__name: NAMESPACE + '.Validator',


		// --- Public Method --- //

		/**
		 * @param {string} message 検証に失敗したときのメッセージ
		 * @param {string} name 検証する値の名前
		 * @param {*} value 検証する値
		 * @param {function(Validator)} validate 検証が定義された関数
		 */
		run: function(message, name, value, validate) {
			if (isSkipValidate(this._category)) {
				return;
			}

			var result = runValidation(name, value, validate);

			if (!result.isValid) {
				var validateMsg = validateResultsToString(result.results, '  ');

				var msg = message;
				msg += '\n[検証結果]';
				msg += validateMsg;
				log.debug(msg);
				throw new TypeError(msg);
			}
		},

		/**
		 * 検証が有効になっているかを返します。
		 *
		 * @returns {boolean} 検証が有効となっていれば true、そうでなければ false
		 */
		isEnabled: function() {
			return !isSkipValidate(this._categorry);
		}
	};

	$.extend(Validator.prototype, validatorDefinition);



	//=============================
	// ArgumentsValidator
	//=============================

	/**
	 * このコンストラクタはユーザが直接呼び出すことはありません。
	 *
	 * @class 引数の検証を行うためのクラスです
	 * @constructor ArgumentsValidator
	 * @param {string} category
	 */
	function ArgumentsValidator(category) {
		requireString('category', category);

		this._category = category;
		this._index = 0;
	}

	/** @lends ArgumentsValidator# */
	var argumentsValidatorDefinition = {

		// --- Metadata --- //

		/**
		 * Eclipse のアウトライン用のコメントです。
		 *
		 * @private
		 * @memberOf _ArgumentsValidator
		 */
		__name: NAMESPACE + '.ArgumentsValidator',


		// --- Public Method --- //

		/**
		 * 引数を検証します。
		 *
		 * @param {string} name 引数の名前
		 * @param {*} value 引数の値
		 * @param {function(Validator)} validate 検証が定義された関数
		 */
		arg: function(name, value, validate) {
			if (isSkipValidate(this._category)) {
				return;
			}

			this._index += 1;
			var result = runValidation(name, value, validate);

			if (!result.isValid) {
				var validateMsg = validateResultsToString(result.results, '  ');

				var msg = format('第{0}引数 {1} が不正な値です;', this._index, name);
				msg += format(' {0}={1}\n', name, value);
				msg += '[検証結果]';
				msg += validateMsg;
				log.debug(msg);
				throw new TypeError(msg);
			}
		},

		/**
		 * 可変長引数を検証します。
		 *
		 * @param {Array.<*>} args 可変長引数
		 * @param {function(Validator)} validate 検証が定義された関数
		 */
		rest: function(args, validate) {
			if (isSkipValidate(this._category)) {
				return;
			}

			this._index += 1;
			var result = runValidation('var_args', args, validate);

			if (!result.isValid) {
				var validateMsg = validateResultsToString(result.results, '  ');

				var msg = format('第{0}引数以降の可変長引数 var_args が不正な値です;', this._index);
				msg += format(' var_args={1}\n', args);
				msg += '[検証結果]';
				msg += validateMsg;
				log.debug(msg);
				throw new TypeError(msg);
			}
		},

		/**
		 * 検証が有効になっているかを返します。
		 *
		 * @returns {boolean} 検証が有効となっていれば true、そうでなければ false
		 */
		isEnabled: function() {
			return !isSkipValidate(this._categorry);
		}
	};

	$.extend(ArgumentsValidator.prototype, argumentsValidatorDefinition);


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	var exports = {
		configure: configure,
		createValidator: createValidator,
		createArgumentsValidator: createArgumentsValidator
	};

	// setting の読み込み
	configure();


	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);

})(jQuery);


// ----- Class Utility ----- //
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.util';

	var DEFAULT_TO_STRING_DEPTH = 1;


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var util = h5.ui.components.datagrid.util;
	var format = util.formatVerbose;

	var log = h5.log.createLogger(NAMESPACE);


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Functions
	//=============================

	/**
	 * prototype を指定してオブジェクトを作成します。
	 * <p>
	 * 継承のために利用する関数で、IE8以前では Object.create() が利用できないため自前で定義しています。
	 * </p>
	 *
	 * @private
	 */
	function createObject(proto) {
		var F = function() {};
		F.prototype = proto;
		return new F();
	}

	/**
	 * クラスを継承させます。
	 * <p>
	 * IE8 との互換性のため constructor プロパティの enumerable 属性を指定できないため、 for-in に constructor
	 * プロパティがでてきてしまうことに注意してください。
	 * </p>
	 *
	 * @private
	 */
	function extendClass(constructor, superConstructor) {
		constructor.superConstructor = superConstructor;
		constructor.prototype = createObject(superConstructor.prototype);
		constructor.prototype.constructor = constructor;
	}

	/**
	 * 定義したクラスの toString のデフォルト実装です。
	 *
	 * @private
	 */
	function defaultToString() {
		/* jshint validthis: true */
		return util.toVerboseString(this, DEFAULT_TO_STRING_DEPTH);
	}

	/**
	 * インターフェースを定義します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {string} interfaceName インターフェース名
	 * @param {Array.<string>} abstractMethods 実装すべきメソッド名の配列
	 * @returns {AbstractMethodSet} インターフェース（抽象メソッドの集合）
	 */
	function defineInterface(interfaceName, abstractMethods) {
		return new AbstractMethodSet(interfaceName, abstractMethods);
	}


	function createArgsValidator(suffix) {
		/* jshint validthis: true */
		var category = this.className;
		if (suffix != null) {
			category += ':' + suffix;
		}
		return util.validator.createArgumentsValidator(category);
	}

	function createValidator(suffix) {
		/* jshint validthis: true */
		var category = this.className;
		if (suffix != null) {
			category += ':' + suffix;
		}
		return util.validator.createValidator(category);
	}

	/**
	 * @typedef {Object} ClassContext
	 * @property {string} className
	 * @property {Log} log
	 * @property {function(string=): ArgumentsValidator} argsValidator
	 */

	/**
	 * 抽象クラスを定義します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {string} className クラスの名前
	 * @param {function(ClassContext) : {constructorFunction: function(new),
	 *            superConstructorFunction: function(new)=, mixins: Array.<Mixin>=,
	 *            abstractMethods: Array.<string>=, definition: Object}} defineFunction
	 *            クラス定義に必要な情報を返す関数
	 * @returns {function(new)} 生成したクラスのコンストラクタ
	 */
	function defineAbstractClass(className, defineFunction) {
		var validator = util.validator.createArgumentsValidator(NAMESPACE);

		validator.arg('className', className, function(v) {
			v.notNull();
			v.type('string');
		});

		validator.arg('defineFunction', defineFunction, function(v) {
			v.notNull();
			v.func();
		});

		var result = defineFunction({
			className: className,
			log: h5.log.createLogger(className),
			argsValidator: createArgsValidator,
			validator: createValidator
		});

		var resultValidator = util.validator.createValidator(NAMESPACE);
		resultValidator.run('definitionFuncion を実行した戻り値が不正です', 'result', result, function(v) {
			v.plainObject();

			v.property('constructorFunction', function(v) {
				v.notNull();
				v.func();
			});

			v.property('superConstructorFunction', function(v) {
				v.nullable();
				v.func();
			});

			v.property('mixins', function(v) {
				v.nullable();
				v.array();
				v.values(function(v) {
					v.implement(Mixin);
				});
			});

			v.property('abstractMethods', function(v) {
				v.notNull();
				v.array();
				v.values(function(v) {
					v.type('string');
				});
			});

			v.property('definition', function(v) {
				v.notNull();
				v.plainObject();
			});
		});

		var constructor = result.constructorFunction;
		var superConstructor = result.superConstructorFunction;
		var mixins = result.mixins;
		var abstractMethods = result.abstractMethods;
		var definition = result.definition;


		// Extend Super Class

		if (superConstructor != null) {
			extendClass(constructor, superConstructor);
		}

		$.extend(constructor.prototype, definition);


		// Mixin

		util.forEach(mixins, function(mixin) {
			if (!mixin.hasInterface(constructor.prototype)) {
				mixin.mix(constructor.prototype);
			}
		});


		// Extend AbstractMethodSet
		var abstractMethodSet = new AbstractMethodSet(className, abstractMethods);
		var abstractMethodSets = [];
		if (superConstructor != null && superConstructor.abstractMethodSets) {
			abstractMethodSets = superConstructor.abstractMethodSets;
		}
		abstractMethodSets.unshift(abstractMethodSet);


		// Override toString()

		if (constructor.prototype.toString === Object.prototype.toString) {
			constructor.prototype.toString = defaultToString;
		}


		// Set Constructor Property

		constructor.log = log;
		constructor.className = className;
		constructor.abstractMethodSets = abstractMethodSets;


		log.debug('Define Abstract Class: {0}', className);

		return constructor;
	}

	/**
	 * クラスを定義します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {string} className クラスの名前
	 * @param {function(ClassContext) : {constructorFunction: function(new),
	 *            superConstructorFunction: function(new)=, mixins: Array.<Mixin>=, definition:
	 *            Object}} defineFunction クラス定義に必要な情報を返す関数
	 * @returns {function(new)} 生成したクラスのコンストラクタ
	 */
	function defineClass(className, defineFunction) {
		var validator = util.validator.createArgumentsValidator(NAMESPACE);

		validator.arg('className', className, function(v) {
			v.notNull();
			v.type('string');
		});

		validator.arg('defineFunction', defineFunction, function(v) {
			v.notNull();
			v.func();
		});

		var log = h5.log.createLogger(className);
		var result = defineFunction({
			className: className,
			log: h5.log.createLogger(className),
			argsValidator: createArgsValidator,
			validator: createValidator
		});

		var resultValidator = util.validator.createValidator(NAMESPACE);
		resultValidator.run('definitionFuncion を実行した戻り値が不正です', 'result', result, function(v) {
			v.plainObject();

			v.property('constructorFunction', function(v) {
				v.notNull();
				v.func();
			});

			v.property('superConstructorFunction', function(v) {
				v.nullable();
				v.func();
			});

			v.property('mixins', function(v) {
				v.nullable();
				v.array();
				v.values(function(v) {
					v.implement(Mixin);
				});
			});

			v.property('definition', function(v) {
				v.notNull();
				v.plainObject();
			});
		});

		var constructor = result.constructorFunction;
		var superConstructor = result.superConstructorFunction;

		var mixins = result.mixins;
		var definition = result.definition;


		// Extend Super Class

		if (superConstructor != null) {
			extendClass(constructor, superConstructor);
		}

		$.extend(constructor.prototype, definition);


		// Mixin

		util.forEach(mixins, function(mixin) {
			if (!mixin.hasInterface(constructor.prototype)) {
				mixin.mix(constructor.prototype);
			}
		});


		// Validate Abstract Method

		if (superConstructor != null && superConstructor.abstractMethodSets != null) {
			util.forEach(superConstructor.abstractMethodSets, function(methodSet) {
				var notImplementMethod = methodSet.findNotImplementMethod(constructor.prototype);
				if (notImplementMethod != null) {
					var pattern = '{0} の定義において {1} の抽象メソッド {2} が実装されていません';
					var msg = format(pattern, className, methodSet, notImplementMethod);
					throw new Error(msg);
				}
			});
		}


		// Override toString()

		if (constructor.prototype.toString === Object.prototype.toString) {
			constructor.prototype.toString = defaultToString;
		}


		// Set Constructor Property

		constructor.log = log;
		constructor.className = className;


		log.debug('Define Class: {0}', className);

		return constructor;
	}


	//=============================
	// Variables
	//=============================

	var Mixin = defineInterface('Mixin', ['mix', 'hasInterface']);


	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	//=============================
	// AbstractMethodSet
	//=============================

	/**
	 * このコンストラクタはユーザが直接呼び出すことはありません。
	 *
	 * @class 抽象メソッドの集合を表すクラスです。
	 * @constructor AbstractMethodSet
	 * @param {string} name 抽象メソッドの集合の名前
	 * @param {Array.<string>} methods メソッド名の配列
	 */
	function AbstractMethodSet(name, methods) {
		var validator = util.validator.createArgumentsValidator(NAMESPACE);

		validator.arg('name', name, function(v) {
			v.notNull();
			v.type('string');
		});

		validator.arg('methods', methods, function(v) {
			v.notNull();
			v.array();

			v.values(function(v) {
				v.notNull();
				v.type('string');
			});
		});

		this._name = name;
		this._methods = methods;
	}

	/** @lends AbstractMethodSet# */
	var abstractMethodSetDefinition = {

		/**
		 * このメンバは eclipse のアウトライン用です。
		 *
		 * @private
		 * @memberOf _AbstractMethodSet
		 */
		__name: NAMESPACE + '.AbstractMethodSet',

		/**
		 * 集合の名前を返す。
		 *
		 * @returns {string} 集合の名前
		 */
		toString: function() {
			return this._name;
		},

		/**
		 * この集合が持つ抽象メソッドのうち実装されていないものをひとつ返す。
		 *
		 * @param {Object} obj 実装メソッドがあるか探す対象
		 * @returns {string} 実装されていないメソッド名、ひとつもなかった場合は null を返す
		 */
		findNotImplementMethod: function(obj) {
			var validator = util.validator.createArgumentsValidator(NAMESPACE);

			validator.arg('obj', obj, function(v) {
				v.notNull();
				v.type('object');
			});

			for (var i = 0, len = this._methods.length; i < len; i++) {
				var method = this._methods[i];
				if (!$.isFunction(obj[method])) {
					return method;
				}
			}
			return null;
		},

		/**
		 * この集合が持つ抽象メソッドのうち実装されていないものを全て返す。
		 *
		 * @param {Object} obj 実装メソッドがあるか探す対象
		 * @returns {Array.<string>} 実装されていないメソッド名の配列
		 */
		findAllNotImplementMethod: function(obj) {
			var validator = util.validator.createArgumentsValidator(NAMESPACE);

			validator.arg('obj', obj, function(v) {
				v.notNull();
				v.type('object');
			});

			return $.grep(this._methods, function(method) {
				return !$.isFunction(obj[method]);
			});
		}
	};

	$.extend(AbstractMethodSet.prototype, abstractMethodSetDefinition);


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	var exports = {
		defineInterface: defineInterface,
		defineAbstractClass: defineAbstractClass,
		defineClass: defineClass
	};


	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);

})(jQuery);


// ----- Support Mixin ----- //
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.util';


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var util = h5.ui.components.datagrid.util;
	var argsToArray = h5.u.obj.argsToArray;


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Functions
	//=============================

	//=============================
	// Variables
	//=============================


	// =========================================================================
	//
	// Mixins
	//
	// =========================================================================

	//=============================
	// OwnSupport
	//=============================

	/**
	 * hifive がロジックとコントローラに提供している own(), ownWithOrg() を自作のクラスで利用するための Mixin です。
	 *
	 * @mixin
	 * @name OwnSupport
	 */
	var ownSupportModule = {

		/**
		 * 指定された関数に対して、コンテキスト(this)をロジックに変更して実行する関数を返します。
		 *
		 * @memberOf OwnSupport#
		 * @param {function} func 関数
		 * @returns {function} コンテキスト(this)をこのオブジェクトに変更した関数
		 */
		own: function(func) {
			return util.bindThis(this, func);
		},

		/**
		 * 指定された関数に対して、コンテキスト(this)をロジックに変更し、元々のthisを第1引数に加えて実行する関数を返します。
		 *
		 * @memberOf OwnSupport#
		 * @param {function} func 関数
		 * @returns {function} コンテキスト(this)をこのオブジェクトに変更し、元々のthisを第1引数に加えた関数
		 */
		ownWithOrg: function(func) {
			var that = this;
			return function(/* var_args */) {
				var args = argsToArray(arguments);
				args.unshift(this);
				return func.apply(that, args);
			};
		}
	};


	var disposableLog = h5.log.createLogger(NAMESPACE + '.Disposable');

	/**
	 * オブジェクトを廃棄できるようにします。
	 * <p>
	 * 具体的には、まず __dispose() メソッドを持つ場合は、そのメソッドを呼び出します。<br>
	 * その後に全てのプロパティを削除します。
	 * </p>
	 *
	 * @mixin
	 * @name Disposable
	 */
	var disposableModule = {

		/**
		 * オブジェクトを廃棄します。
		 */
		dispose: function() {
			disposableLog.debug('Dispose: {0}', this);
			this._isDisposed = true;

			if ($.isFunction(this.__dispose)) {
				this.__dispose();
				this.__dispose = $.noop;
			}

			for ( var key in this) {
				if (key === '_isDisposed' || key === 'isDisposed') {
					return;
				}
				var property = this[key];

				if (property != null && util.disposable.hasInterface(property)) {
					if (property.isChainDisposable() && !property.isDisposed()) {
						property.dispose();
					}
				}

				// MEMO: プロトタイプで継承したものは消さない
				if (!util.hasProperty(this, key)) {
					continue;
				}

				delete this[key];
			}
		},

		enableChainDispose: function() {
			this._isChainDisposable = true;
		},

		disableChainDispose: function() {
			this._isChainDisposable = false;
		},

		isChainDisposable: function() {
			return this._isChainDisposable;
		},

		isDisposed: function() {
			return this._isDisposed;
		},


		_isChainDisposable: true,

		_isDisposed: false
	};


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/** @lends h5.ui.components.datagrid.util */
	var exports = {

		/**
		 * OwnSupport の Mixin です。
		 *
		 * @type Mixin
		 * @memberOf h5.ui.components.datagrid.util
		 */
		ownSupport: h5.mixin.createMixin(ownSupportModule),

		/**
		 * Disposable の Mixin です。
		 *
		 * @type Mixin
		 * @memberOf h5.ui.components.datagrid.util
		 */
		disposable: h5.mixin.createMixin(disposableModule)
	};

	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);

})(jQuery);


// ----- Other Utility ----- //
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.util';


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var util = h5.ui.components.datagrid.util;

	var argsToArray = h5.u.obj.argsToArray;
	var format = util.formatVerbose;
	var createArgsValidator = util.validator.createArgumentsValidator;
	var createValidator = util.validator.createValidator;


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Functions
	//=============================

	// ---- Object Utility ---- //

	/**
	 * @private
	 * @param {*} a
	 * @param {*} b
	 * @param {Array.<*>} parents
	 * @returns {boolean}
	 */
	function deepEqualsValue(a, b, parents) {
		// 循環していたら false とみなす
		if ($.inArray(a, parents) !== -1) {
			return false;
		}
		if (util.isPlainObject(a) && util.isPlainObject(b)) {
			return deepEqualsPlainObject(a, b, parents);
		}
		if ($.isArray(a) && $.isArray(b)) {
			return deepEqualsArray(a, b, parents);
		}
		return a === b;
	}

	/**
	 * @private
	 * @param {Object} a
	 * @param {Object} b
	 * @param {Array.<*>} parents
	 * @returns {boolean}
	 */
	function deepEqualsPlainObject(a, b, parents) {
		var copyB = $.extend({}, b);
		var nextParents = parents.concat([a]);

		for ( var key in a) {
			var aValue = a[key];
			var bValue = b[key];

			if (!deepEqualsValue(aValue, bValue, nextParents)) {
				return false;
			}

			delete copyB[key];
		}

		return $.isEmptyObject(copyB);
	}

	/**
	 * @private
	 * @param {Array.<*>} a
	 * @param {Array.<*>} b
	 * @param {Array.<*>} parents
	 * @returns {boolean}
	 */
	function deepEqualsArray(a, b, parents) {
		var len = a.length;

		if (len !== b.length) {
			return false;
		}

		var nextParents = parents.concat([a]);

		for (var i = 0; i < len; i++) {
			var aValue = a[i];
			var bValue = b[i];

			if (!deepEqualsValue(aValue, bValue, nextParents)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * a と b をプロパティの値を見て等しい値か調べます。
	 * <p>
	 * 子要素を追って見るのは PlainObject と Array に限られ、それ以外は === 演算子によって比較します。 また、循環参照がある場合は常に false を返します。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {*} a 比較対象その1
	 * @param {*} b 比較対象その2
	 * @returns {boolean} a と b が等しければ true、そうでなければ false
	 */
	function deepEquals(a, b) {
		return deepEqualsValue(a, b, []);
	}

	/**
	 * オブジェクトが持つプロパティの数を数えます。
	 * <p>
	 * PlainObject でないものを引数として渡すとエラーとなります。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Object} obj オブジェクト
	 * @returns {number} オブジェクトの持つプロパティの数（整数）
	 */
	function objectSize(obj) {
		var validator = createArgsValidator(NAMESPACE);

		validator.arg('obj', obj, function(v) {
			v.notNull();
			v.plainObject();
		});

		var size = 0;
		for ( var key in obj) {
			if (util.hasProperty(obj, key)) {
				size += 1;
			}
		}

		return size;
	}

	/**
	 * コレクションの各値を関数で処理して、新たなオブジェクトを作成します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Object|Array.<*>} collection 対象のオブジェクト、または配列
	 * @param {function(value, key): { key: *, value: *}} mapFunction 各値を処理する関数
	 * @returns {Object} 各値を処理してできた関数
	 */
	function mapObject(collection, mapFunction) {
		var validator = createArgsValidator(NAMESPACE);

		validator.arg('collection', collection, function(v) {
			v.notNull();

			v.or(function(v) {
				v.array();
				v.plainObject();
			});
		});

		validator.arg('mapFunction', mapFunction, function(v) {
			v.notNull();
			v.func();
		});


		var result = {};

		var resultValidator = createValidator(NAMESPACE);

		util.forEach(collection, function(value, key) {
			var pair = mapFunction(value, key);

			resultValidator.run('mapFunction の戻り値が不正です', 'result', pair, function(v) {
				v.property('key', function(v) {
					v.notNull();
					v.type('string');
				});

				v.property('value', function(v) {
					v.notUndefined();
				});
			});

			if (util.hasProperty(result, pair.key)) {
				var msg = format('mapObject() の結果に key の重複があります; key={0}', pair.key);
				throw new Error(msg);
			}

			result[pair.key] = pair.value;
		});

		return result;
	}


	// ---- Array Utility ---- //


	/**
	 * @private
	 * @param {ValidatorContext} v
	 */
	function validateCompared(v) {
		v.notNull();
		v.type('number');
		v.notNaN();
	}

	function validateComparedSame(v) {
		validateCompared(v);
		v.equal(0);
	}

	/**
	 * @private
	 * @param {ValidatorContext} v
	 */
	function validateComparedLM(v) {
		validateCompared(v);
		v.max(0);
	}


	/**
	 * @typedef {Object} BinarySearchResult
	 * @memberOf h5.ui.components.datagrid.util
	 * @property {boolean} isFound 値が見つかったか
	 * @property {number} index インデックス（整数）
	 */

	/**
	 * ソート済みの配列を2分探索します。
	 * <p>
	 * indexOf() などとは異なり、見つからなかった場合もインデックスを {@link BinarySearchResult} の形式で返します。<br>
	 * 見つからなかった場合のインデックスは指定した値の直後の値を指します。<br>
	 * また、関数の実行中にソート済み配列でないことがわかったら例外を投げます。（あくまでわかったらであり、確実ではないことに注意してください）
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Array.<*>} sortedArray ソート済みの配列
	 * @param {*} value インデックスを調べる値
	 * @param {boolean} returnNext true の場合は最後の値の次のインデックス、falseの場合は最初の値のインデックスを返す
	 * @param {function(*, *): boolean} compare 2つの値を比較する関数
	 * @returns {BinarySearchResult} 2分探索の結果
	 */
	function binarySearch(sortedArray, value, returnNext, compare) {
		var validator = createArgsValidator(NAMESPACE);

		validator.arg('sortedArray', sortedArray, function(v) {
			v.notNull();
			v.array();
		});

		validator.arg('value', value, $.noop);

		validator.arg('returnNext', returnNext, function(v) {
			v.notNull();
			v.type('boolean');
		});

		validator.arg('compare', compare, function(v) {
			v.notNull();
			v.func();
		});


		var low = 0;
		var high = sortedArray.length;


		var comparedValidator = util.validator.createValidator(NAMESPACE);
		var comparedMid;

		while (low < high) {
			var mid = Math.floor((low + high) / 2);
			var midValue = sortedArray[mid];
			comparedMid = compare(sortedArray[mid], value);

			// compare の結果の検証
			comparedValidator.run('compare の結果が不正です', 'computed', comparedMid, validateCompared);

			// 順序などのチェック
			if (comparedValidator.isEnabled()) {
				var comparedSame = compare(midValue, midValue);
				var patternSame = 'compare に同じ値を渡しても 0 が返りませんでした; array[{0}]={1}';
				var msgSame = util.formatVerbose(patternSame, mid, midValue);
				comparedValidator.run(msgSame, 'compared', comparedSame, validateComparedSame);

				var comparedLM = compare(sortedArray[low], midValue);
				var pattern = 'sortedArray がソート済みでないことを見つけました; array[{0}]={1}, array[{2}]={3}';
				var msg = util.formatVerbose(pattern, low, sortedArray[low], mid, midValue);
				comparedValidator.run(msg, 'compared', comparedLM, validateComparedLM);
			}

			var moveLow = returnNext ? (comparedMid <= 0) : (comparedMid < 0);

			if (moveLow) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}

		var checkIndex = returnNext ? high - 1 : high;
		var isFound = compare(sortedArray[checkIndex], value) === 0;

		return {
			isFound: isFound,
			index: high
		};
	}


	// ---- Function Utility ---- //

	/**
	 * 指定した時間待って関数を実行します。
	 * <p>
	 * setTimeout() とは関数に引数が渡せる部分と戻り値として Promise を返す部分が異なります。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {number} wait 待機する時間
	 * @param {function} delayFunction 実行する関数
	 * @param {...*} [var_args] delayFunction に渡す引数
	 * @returns {Promise} delayFunction の結果を返す Promise オブジェクト
	 */
	function delay(wait, delayFunction /* , var_args */) {

		// MEMO: AbortablePromise を返すようにしたい

		var validator = createArgsValidator(NAMESPACE);

		validator.arg('wait', wait, function(v) {
			v.notNull();
			v.type('number');
			v.integer();
			v.min(0);
		});

		validator.arg('delayFunction', delayFunction, function(v) {
			v.notNull();
			v.func();
		});

		var args = argsToArray(arguments).slice(2);


		var deferred = h5.async.deferred();

		var timeoutId = setTimeout(function() {
			try {
				var result = delayFunction.apply(null, args);
				deferred.resolve(result);
			} catch (e) {
				deferred.reject(result);
			}
		}, wait);

		var promise = deferred.promise();
		promise.abort = function() {
			clearTimeout(timeoutId);
		};

		return promise;
	}

	/**
	 * 渡した関数を一度だけ実行し、それ以後は呼び出しても結果だけを返す関数を作成します。
	 * <p>
	 * 渡した関数が例外を投げた場合は、次の呼び出し時も処理を実行しようとします。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {function} onceFunction 一度だけ実行したい関数
	 * @returns {function} 一度実行したら、それ以降は結果だけ返す関数
	 */
	function once(onceFunction) {
		var done = false;
		var result;

		return function() {
			if (!done) {
				result = onceFunction();
				done = true;
			}
			return result;
		};
	}


	// ---- Error Definition Utility ---- //

	/**
	 * エラー定義のセットを作成します。
	 *
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {string} category エラーカテゴリ
	 * @param {Object.<string, string>} errorDefinition key と pattern のマップ
	 * @returns {Object.<string, ErrorDefinition>} key と ErrorDefinition のマップ
	 */
	function createErrorDefinitionSet(category, errorDefinitions) {

		var validator = createArgsValidator(NAMESPACE);

		validator.arg('category', category, function(v) {
			v.notNull();
			v.type('string');
		});

		validator.arg('errorDefinition', errorDefinitions, function(v) {
			v.notNull();
			v.plainObject();

			v.values(function(v) {
				v.notNull();
				v.type('string');
			});
		});


		var set = {};

		for ( var key in errorDefinitions) {
			if (!util.hasProperty(errorDefinitions, key)) {
				continue;
			}
			var pattern = errorDefinitions[key];
			var definition = new ErrorDefinition(category, key, pattern);
			set[key] = definition;
		}

		return set;
	}


	// ---- Event Listener Utility ---- //

	/**
	 * @private
	 */
	function propagateEvent(event) {
		/* jshint validthis: true */
		this.dispatchEvent(event);
	}


	/**
	 * イベントリスナをまとめて登録するためのオブジェクトを作成します。。
	 *
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {Object} context イベントリスナの this にセットするオブジェクト
	 * @returns {EventListenerSet} イベントリスナの集合
	 */
	function createEventListenerSet(context) {
		var validator = createArgsValidator(NAMESPACE);

		validator.arg('context', context, function(v) {
			v.notNull();
		});

		return new EventListenerSet(context);
	}


	/**
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {number} wait 待機するミリ秒（整数）
	 * @param {Function} func 実行する処理
	 * @param {Object=} [option] オプション設定のオブジェクト
	 * @param {boolean} [option.deferFirst=false] 最初の呼び出しを遅延させるか
	 * @param {boolean} [option.deferInWaiting=false] 待機中の呼び出しで更に呼び出しを遅延させるか
	 * @param {boolean} [option.ignoreInCooling=false] 実行後 wait 時間経つまでの呼び出しを無視するか
	 * @param {function(Array.<*>=, Array.<*>): Array.<*>} [options.aggregateArgsFunction]
	 *            引数のまとめ方（デフォルトは最新で上書き）
	 * @returns {Throttle} 処理の実行を絞るための {@link Throttle} オブジェクト
	 */
	function createThrottle(wait, func, option) {
		return new Throttle(wait, func, option);
	}

	/**
	 * @public
	 * @memberOf h5.ui.components.datagrid.util
	 * @param {number} firstWait
	 * @param {number} interval
	 * @param {Function} func
	 * @returns {Repeat}
	 */
	function createRepeat(firstWait, interval, func) {
		return new Repeat(firstWait, interval, func);
	}


	//=============================
	// Variables
	//=============================


	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	//=============================
	// ErrorDefinition
	//=============================

	var ErrorDefinition = util.defineClass(NAMESPACE + '.ErrorDefinition', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @class エラー定義を表すクラスです。
		 * @constructor ErrorDefinition
		 * @param {string} category エラーカテゴリ
		 * @param {string} key エラーを表現するキー
		 * @param {string} pattern メッセージを生成するパターン
		 */
		function ErrorDefinition(category, key, pattern) {

			var validator = ctx.argsValidator('constructor');

			validator.arg('category', category, function(v) {
				v.notNull();
				v.type('string');
			});

			validator.arg('key', key, function(v) {
				v.notNull();
				v.type('string');
			});

			validator.arg('pattern', pattern, function(v) {
				v.notNull();
				v.type('string');
			});

			this._category = category;
			this._key = key;
			this._pattern = pattern;

			this._log = h5.log.createLogger(category);
		}

		/** @lends ErrorDefinition# */
		var errorDefinitionMethods = {

			/**
			 * このメンバは eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _ErrorDefinition
			 */
			__name: ctx.className,

			/**
			 * 注釈付きエラーを生成します。
			 *
			 * @param {Array.<string>} var_args パターンに渡すパラメータ
			 * @returns {Error} 注釈付きエラー
			 */
			createError: function(/* var_args */) {
				var args = argsToArray(arguments);
				args.unshift(this._pattern);

				var header = format('{0} [{1}] ', this._category, this._key);
				var msg = header + format.apply(null, args);

				var error = new Error(msg);
				error.category = this._category;
				error.key = this._key;

				this._log.debug('Create Error: {0}', msg);

				return error;
			},

			/**
			 * この定義から生成されたエラーであるかを判定します。
			 *
			 * @param {Error} e エラー
			 * @returns {boolean} この定義から生成されたエラーであるか否か
			 */
			isInstance: function(e) {
				if (!(e instanceof Error)) {
					return false;
				}
				if (e.category == null) {
					return false;
				}
				if (e.key == null) {
					return false;
				}

				return e.category === this._category && e.key === this._key;
			}
		};

		return {
			constructorFunction: ErrorDefinition,
			definition: errorDefinitionMethods
		};
	});


	//=============================
	// EventListenerSet
	//=============================

	/**
	 * {@link EventListenerSet#registerEventListeners registerEventListeners()} に指定できるイベントリスナの型です。
	 * <p>
	 * 通常の関数の他に、'propagate' と文字列を指定することもでき、その場合はイベントをそのまま自分のイベントして伝搬させます。
	 * </p>
	 *
	 * @typeof {function(Event)|string} EventListener
	 * @memberOf EventListenerSet
	 */

	var EventListenerSet = util.defineClass(NAMESPACE + '.EventListenerSet', function(ctx) {

		var log = ctx.log;

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @class イベントリスナをまとめて登録（削除）するためのクラスです。
		 * @constructor EventListenerSet
		 * @param {Object} context イベントリスナの this にセットするオブジェクト
		 */
		function EventListenerSet(context) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('context', context, function(v) {
				v.notNull();
			});

			this._context = context;
			this._isEventDispatcher = h5.mixin.eventDispatcher.hasInterface(context);
			this._listeners = [];
		}

		/** @lends EventListenerSet# */
		var eventListenerSetDefinition = {

			// --- Metadata --- //

			/**
			 * このメンバは eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _EventListenerSet
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * イベントリスナをまとめて登録します。
			 *
			 * @param {Object.<string, Object.<string, EventListener>>} listenersDefinition
			 *            イベントリスナの定義オブジェクト
			 */
			registerEventListeners: function(listenersDefinition) {
				var validator = createArgsValidator(NAMESPACE);

				validator.arg('listenersDefinition', listenersDefinition, function(v) {
					v.notNull();
					v.plainObject();

					v.values(function(v) {
						v.notNull();
						v.plainObject();

						v.values(function(v) {
							v.notNull();

							v.or(function(v) {
								v.equal('propagate');
								v.func();
							});
						});
					});
				});

				var msg;

				for ( var key in listenersDefinition) {
					if (!util.hasProperty(listenersDefinition, key)) {
						continue;
					}

					var dispatcher = this._context[key];
					var definition = listenersDefinition[key];

					// MEMO: this の表記は他の表現にした方がいいかも
					if (key === 'this') {
						if (!this._isEventDispatcher) {
							msg = 'this を指定するには context が EventDispatcher である必要があります';
							throw new TypeError(msg);
						}
						dispatcher = this._context;
					}

					for ( var type in definition) {
						if (!util.hasProperty(definition, type)) {
							continue;
						}
						var listener = definition[type];

						// 'propagate' を指定したら propagateEvent とする
						if (listener === 'propagate') {
							if (!this._isEventDispatcher) {
								msg = '"propagate" を指定するには context が EventDispatcher である必要があります';
								throw new TypeError(msg);
							}
							if (dispatcher === this._context) {
								msg = 'context 自身のイベントに "propagate" を指定することはできません';
								throw new TypeError(msg);
							}
							listener = propagateEvent;
						}
						this._addEventListener(dispatcher, type, listener);
					}
				}
			},

			/**
			 * 登録した全てのイベントリスナをイベントディスパッチャから削除します。
			 */
			removeAllListeners: function() {
				var listeners = this._listeners;
				for (var i = 0, len = listeners.length; i < len; i++) {
					var entry = listeners[i];

					log.debug('REMOVE eventListener: type="{0}"; {1} -> {2}', entry.type, util
							.className(entry.dispatcher), util.className(this._context));

					entry.dispatcher.removeEventListener(entry.type, entry.listener);
				}

				this._listeners = [];
			},


			// --- Life Cycle Method --- //

			__dispose: function() {
				this.removeAllListeners();
			},

			// --- Private Property --- //

			/**
			 * @private
			 * @type {Object}
			 */
			_context: null,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isEventDispatcher: null,

			/**
			 * @private
			 * @type {Array.<Function>}
			 */
			_listeners: null,


			// --- Private Method --- //

			/**
			 * イベントリスナを登録します。
			 *
			 * @private
			 * @param {EventDispatcher} eventDispatcher イベントディスパッチャ
			 * @param {string} type タイプ
			 * @param {function(Event)} listener イベントリスナ
			 */
			_addEventListener: function(eventDispatcher, type, listener) {
				var validator = ctx.argsValidator('public');

				validator.arg('eventDispatcher', eventDispatcher, function(v) {
					v.notNull();
					v.eventDispatcher();
				});

				validator.arg('type', type, function(v) {
					v.notNull();
					v.type('string');
				});

				validator.arg('listener', listener, function(v) {
					v.notNull();
					v.func();
				});

				var context = this._context;

				var dispatcherName = util.className(eventDispatcher);
				var contextName = util.className(context);


				var actualListener = function(event) {
					var msgFormat = 'FIRE event: type={0}; {1} -> {2}';
					log.trace(msgFormat, type, dispatcherName, contextName);
					listener.call(context, event);
				};

				this._listeners.push({
					dispatcher: eventDispatcher,
					type: type,
					listener: actualListener
				});

				var msgFormat = 'ADD eventListener: type={0}; {1} -> {2}';
				log.trace(msgFormat, type, dispatcherName, contextName);

				eventDispatcher.addEventListener(type, actualListener);
			}

		};

		return {
			constructorFunction: EventListenerSet,
			mixins: [util.disposable],
			definition: eventListenerSetDefinition
		};

	});


	//=============================
	// Throttle
	//=============================

	var Throttle = util.defineClass(NAMESPACE + '.Throttle', function(ctx) {

		var log = ctx.log;


		/**
		 * {@link Throttle} の状態を表す文字列です。
		 * <p>
		 * 以下の3つの値のどれかになります。
		 * <ul>
		 * <li>normal: 通常のなにも待機していない状態</li>
		 * <li>waiting: 実行を待機している状態</li>
		 * <li>cooling: 実行後、waitだけ時間経つまでの状態</li>
		 * </ul>
		 * </p>
		 *
		 * @typedef {string} ThrottleStateString
		 * @memberOf Throttle
		 */

		var STATE_NORMAL = 'normal';
		var STATE_WAITING = 'waiting';
		var STATE_COOLING = 'cooling';

		/**
		 * デフォルトの aggregateArgsFunction です。
		 * <p>
		 * 新しい引数をそのまま利用します。
		 * </p>
		 *
		 * @private
		 * @param {Array.<*>=} beforeArgs 以前の引数
		 * @param {Array.<*>} args 新しい引数
		 * @returns {Array.<*>} 新しい引数
		 */
		function defaultAggregateArgs(beforeArgs, args) {
			return args;
		}

		var DEFAULT_OPTION = {
			deferFirst: false,
			deferInWaiting: false,
			ignoreInCooling: false,
			aggregateArgsFunction: defaultAggregateArgs
		};


		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor Throttle
		 * @class 処理の実行回数を絞るためのクラスです。
		 *        <p>
		 *        デフォルトでは Underscore.js や lodash などの throttle と同じ挙動をします。<br>
		 *        deferFirst と deferInWaiting を true とすると Underscore.js の debounce と同じ挙動となります。
		 *        </p>
		 * @param {number} wait 待機するミリ秒（整数）
		 * @param {Function} func 実行する処理
		 * @param {Object=} [option] オプション設定のオブジェクト
		 * @param {boolean} [option.deferFirst=false] 最初の呼び出しを遅延させるか
		 * @param {boolean} [option.deferInWaiting=false] 待機中の呼び出しで更に呼び出しを遅延させるか
		 * @param {boolean} [option.ignoreInCooling=false] 実行後 wait 時間経つまでの呼び出しを無視するか
		 * @param {function(Array.<*>=, Array.<*>): Array.<*>} [option.aggregateArgsFunction]
		 *            引数のまとめ方（デフォルトは最新で上書き）
		 */
		function Throttle(wait, func, option) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('wait', wait, function(v) {
				v.notNull();
				v.type('number');
				v.integer();
				v.positiveNumber();
			});

			validator.arg('func', func, function(v) {
				v.notNull();
				v.func();
			});

			validator.arg('option', option, function(v) {
				v.nullable();
				v.plainObject();

				v.property('deferFirst', function(v) {
					v.nullable();
					v.type('boolean');
				});

				v.property('deferInWaiting', function(v) {
					v.nullable();
					v.type('boolean');
				});

				v.property('ignoreInCooling', function(v) {
					v.nullable();
					v.type('boolean');
				});

				v.property('aggregateArgsFunction', function(v) {
					v.nullable();
					v.func();
				});
			});

			this._wait = wait;
			this._func = func;

			var _option = $.extend({}, DEFAULT_OPTION, option);

			this._isDeferFirst = _option.deferFirst;
			this._isDeferInWaiting = _option.deferInWaiting;
			this._isIgnoreInCooling = _option.ignoreInCooling;
			this._aggregateArgsFunction = _option.aggregateArgsFunction;

			this._state = STATE_NORMAL;
			this._timeoutId = null;
		}

		/** @lends Throttle# */
		var throttleDefinition = {

			// --- Metadata --- //

			/**
			 * このメンバは Eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _Throttle
			 */
			__name: ctx.className,


			// --- Public Method --- //

			call: function(/* var_args */) {
				if (this._isIgnoreInCooling && this._state === STATE_COOLING) {
					return;
				}

				log.trace('CALL throttle');


				var args = argsToArray(arguments);
				this._args = this._aggregateArgsFunction(this._args, args);

				// 初回は遅延しないなら実行して cooling, そうでないなら waiting に遷移
				if (this._state === STATE_NORMAL) {
					// 初回実行

					if (this._isDeferFirst) {
						log.trace('STATE {0} -> {1}', this._state, STATE_WAITING);
						this._state = STATE_WAITING;
					} else {
						var callArgs = this._args;

						log.trace('STATE {0} -> {1}', this._state, STATE_COOLING);
						this._args = null;
						this._state = STATE_COOLING;

						log.trace('RUN function');
						this._func.apply(null, callArgs);
					}

					this._setTimer();
					return;
				}

				// cooling 中の呼び出しは waiting に遷移
				if (this._state === STATE_COOLING) {
					log.trace('STATE {0} -> {1}', this._state, STATE_WAITING);
					this._state = STATE_WAITING;
				}

				// タイマを再セットする設定の場合は clearTimeout して再度セット
				if (this._isDeferInWaiting) {
					log.trace('CLAER timer');
					clearTimeout(this._timeoutId);
					this._setTimer();
				}
			},

			cancel: function() {
				log.trace('CANCEL');

				if (this._state === STATE_NORMAL) {
					return;
				}

				log.trace('STATE {0} -> {1}', this._state, STATE_NORMAL);
				this._state = STATE_NORMAL;
				clearTimeout(this._timeoutId);
				this._timeoutId = null;
				this._args = null;
			},

			isNormal: function() {
				return this._state === STATE_NORMAL;
			},

			isWaiting: function() {
				return this._state === STATE_WAITING;
			},

			isCooling: function() {
				return this._state === STATE_COOLING;
			},


			// --- Life Cycle Method --- //

			__dispose: function() {
				this.cancel();
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {number}
			 */
			_wait: null,

			/**
			 * @private
			 * @type {Function}
			 */
			_func: null,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isDeferFirst: null,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isDeferInWaiting: null,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isIgnoreInCooling: null,

			/**
			 * @private
			 * @type {function(Array.<*>=, Array.<*>): Array.<*>}
			 */
			_aggregateArgsFunction: null,

			/**
			 * @private
			 * @type {ThrottleStateString}
			 */
			_state: null,

			/**
			 * @private
			 * @type {number}
			 */
			_timeoutId: null,

			/**
			 * @private
			 * @type{Array.<*>=}
			 */
			_args: null,


			// --- Private Method --- //

			_fire: function() {
				if (this._state === STATE_NORMAL) {
					log.warn('normal 状態で実行されることはありえないはずなので無視します');
					return;
				}

				if (this._state === STATE_COOLING) {
					log.trace('STATE {0} -> {1}', this._state, STATE_NORMAL);
					this._state = STATE_NORMAL;
					this._timeoutId = null;
					return;
				}

				var args = this._args;

				log.trace('STATE {0} -> {1}', this._state, STATE_COOLING);
				this._state = STATE_COOLING;
				this._args = null;

				log.trace('RUN throttle function');
				this._func.apply(null, args);
				this._setTimer();
			},

			_setTimer: function() {
				log.trace('SET timer');
				this._timeoutId = setTimeout(this.own(this._fire), this._wait);
			}

		};

		return {
			constructorFunction: Throttle,
			mixins: [util.ownSupport, util.disposable],
			definition: throttleDefinition
		};
	});


	//=============================
	// Repeat
	//=============================

	var Repeat = util.defineClass(NAMESPACE + '.Repeat', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor Repeat
		 * @class 処理を一定の時間をあけて繰り返し実行するためのクラスです。
		 * @param {number} firstWait 最初の処理から次の処理までの時間（ミリ秒）
		 * @param {number} interval 処理と処理の間の時間（ミリ秒）
		 * @param {Function} func 実行する処理
		 */
		function Repeat(firstWait, interval, func) {
			this._firstWait = firstWait;
			this._interval = interval;
			this._func = func;
		}

		/** @lends Repeat# */
		var repeatDefinition = {

			// --- Metadata --- //

			/**
			 * このメンバは Eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _Repeat
			 */
			__name: ctx.className,


			// --- Life Cycle Method --- //

			__dispose: function() {
				this.stop();
			},


			// --- Public Method --- //

			start: function(/* var_args */) {
				this._args = arguments;
				this._callFunc(true);
			},

			stop: function() {
				clearTimeout(this._timeoutId);
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {number}
			 */
			_firstWait: null,

			/**
			 * @private
			 * @type {number}
			 */
			_interval: null,

			/**
			 * @private
			 * @type {Function}
			 */
			_func: null,

			/**
			 * @private
			 * @type {Arguments}
			 */
			_args: null,


			/**
			 * @private
			 * @type {number}
			 */
			_timeoutId: null,


			// --- Private Method --- //

			_callFunc: function(isFirst) {
				var waitTime = isFirst ? this._firstWait : this._interval;
				this._timeoutId = setTimeout(this.own(function() {
					this._callFunc(false);
				}), waitTime);

				this._func.apply(null, this._args);
			}
		};


		return {
			constructorFunction: Repeat,
			mixins: [util.ownSupport, util.disposable],
			definition: repeatDefinition
		};
	});


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/** @lends h5.ui.components.datagrid.util */
	var exports = {

		deepEquals: deepEquals,
		objectSize: objectSize,
		mapObject: mapObject,
		binarySearch: binarySearch,
		delay: delay,
		once: once,

		createErrorDefinitionSet: createErrorDefinitionSet,
		createEventListenerSet: createEventListenerSet,
		createThrottle: createThrottle,
		createRepeat: createRepeat
	};

	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);

})();

/* ----- h5.ui.components.datagrid.type ----- */
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.type';

	/**
	 * @name type
	 * @memberOf h5.ui.components.datagrid
	 * @namespace
	 */
	h5.u.obj.ns(NAMESPACE);


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Functions
	//=============================

	// ---- Type Definition & Validate Function ---- //

	/**
	 * インデックスを表す型です。
	 *
	 * @typedef {number} Index
	 */

	function validateIndex(v) {
		v.check('Index', function(v) {
			v.notNull();
			v.type('number');
			v.integer();
			v.min(0);
		});
	}

	/**
	 * 長さを表す型です。
	 *
	 * @typedef {number} Length
	 */

	function validateLength(v) {
		v.check('Length', function(v) {
			v.notNull();
			v.type('number');
			v.integer();
			v.min(0);
		});
	}



	/**
	 * データを表す型です。
	 *
	 * @typedef {Object} Data
	 */

	function validateData(v) {
		v.check('Data', function(v) {
			v.notNull();
			v.plainObject();
		});
	}

	/**
	 * データが持つ値を表す型です。
	 *
	 * @typedef {*} Value
	 */

	function validateValue(v) {
		v.check('Value', function(v) {
			v.notUndefined();
		});
	}

	/**
	 * データのIDを表す型です。
	 * <p>
	 * JSON Patch の関係でスラッシュ "/" を含むことができません。
	 * </p>
	 *
	 * @typedef {string} DataId
	 */

	function validateDataId(v) {
		v.check('DataId', function(v) {
			v.notNull();
			v.type('string');
			v.match(/^[^\/]*$/);
		});
	}

	/**
	 * データのプロパティ名を表す型です。
	 * <p>
	 * JSON Patch の関係でスラッシュ "/" を含むことができません。
	 * </p>
	 *
	 * @typedef {string} PropertyName
	 */

	function validatePropertyName(v) {
		v.check('PropertyName', function(v) {
			v.notNull();
			v.type('string');
			v.match(/^[^\/]*$/);
		});
	}

	/**
	 * データのIDとデータ自身のマッピングを表す型です。
	 *
	 * @typedef {Object.<DataId, Data>} DataSet
	 */

	function validateDataSet(v) {
		v.check('DataSet', function(v) {
			v.notNull();
			v.plainObject();

			v.keys(validateDataId);
			v.values(validateData);
		});
	}

	/**
	 * データに対するフィルタ関数の型です。
	 *
	 * @typedef {function(Data): boolean} DataFilterPredicate
	 */

	function validateDataFilterPredicate(v) {
		v.check('FilterPredicate', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * 値に対するフィルタ関数の型です。
	 *
	 * @typedef {function(Value): boolean} ValueFilterPredicate
	 */

	function validateValueFilterPredicate(v) {
		v.check('ValueFilterPredicate', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * ローカルで実行可能なプロパティに対するフィルタのパラメータを表す型です。
	 *
	 * @typedef {Object} LocalValueFilterParam
	 * @property {PropertyName} property
	 * @property {Value=} value
	 * @property {RegExp=} regexp
	 * @property {ValueFilterPredicate=} predicate
	 */

	function validateLocalValueFilterParam(v) {
		v.check('LocalValueFilterParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('property', validatePropertyName);

			v.or(function(v) {
				v.property('value', validateValue);
				v.property('predicate', validateValueFilterPredicate);

				v.property('regexp', function(v) {
					v.regexp();
				});
			});
		});
	}

	/**
	 * ローカルで実行可能なフィルタのパラメータとなる型です。
	 *
	 * @typedef {LocalValueFilterParam|DataFilterPredicate} LocalFilterParam
	 */

	function validateLocalFilterParam(v) {
		v.check('LocalFilterParam', function(v) {
			v.or(function(v) {
				validateLocalValueFilterParam(v);
				validateDataFilterPredicate(v);
			});
		});
	}


	/**
	 * ソートで並べる順を表した文字列です。
	 * <p>
	 * 以下の2つの値のどちらかとなります。
	 * <ul>
	 * <li>asc: 昇順</li>
	 * <li>desc: 降順</li>
	 * </ul>
	 * </p>
	 *
	 * @typedef {string} OrderString
	 */

	function validateOrderString(v) {
		v.check('OrderString', function(v) {
			v.notNull();
			v.type('string');
			v.any(['asc', 'desc']);
		});
	}

	/**
	 * ソートのパラメータとなる型です。
	 *
	 * @typedef {Object} SortParam
	 * @property {PropertyName} property ソートするプロパティ名
	 * @property {OrderString} order ソートで並べる順
	 */

	function validateSortParam(v) {
		v.check('SortParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('property', validatePropertyName);
			v.property('order', validateOrderString);
		});
	}

	/**
	 * ツリーのパラメータとなる型です。
	 *
	 * @typedef {Object} TreeParam
	 * @property {PropertyName} parentProperty
	 * @property {Object.<DataId, boolean>} openParents
	 */

	function validateTreeParam(v) {
		v.check('TreeParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('parentProperty', validatePropertyName);

			v.property('openParents', function(v) {
				v.notNull();
				v.array();

				v.values(validateDataId);
			});
		});
	}

	/**
	 * ローカルでの検索のパラメータとなる型です。
	 *
	 * @typedef {Object} LocalSearchParam
	 * @property {Array.<LocalFilterParam>=} filter
	 * @property {Array.<SortParam>=} sort
	 * @property {TreeParam=} tree
	 */

	function validateLocalSearchParam(v) {
		v.check('LocalSearchParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('filter', function(v) {
				v.nullable();
				v.array();
				v.values(validateLocalFilterParam);
			});

			v.property('sort', function(v) {
				v.nullable();
				v.array();
				v.values(validateSortParam);
			});

			v.property('tree', function(v) {
				v.nullable();
				validateTreeParam(v);
			});
		});
	}

	/**
	 * 一般的なフィルタのパラメータとなる型です。
	 *
	 * @typedef {Object} FilterParam
	 * @property {string} key
	 * @property {Value} value
	 */

	/**
	 * サーバでのでの検索のパラメータとなる型です。
	 *
	 * @typedef {Object} ServerSearchParam
	 * @property {Array.<FilterParam>=} filter
	 * @property {Array.<SortParam>=} sort
	 */

	function validateServerSearchParam(v) {
		v.check('ServerSearchParam', function(v) {
			v.property('filter', function(v) {
				v.nullable();
				v.array();
				v.values(function(v) {
					v.notNull();
					v.plainObject();
				});
			});

			v.property('sort', function(v) {
				v.nullable();
				v.array();
				v.values(validateSortParam);
			});
		});
	}

	/**
	 * 検索のパラメータとなる型です。
	 *
	 * @typedef {LocalSearchParam|ServerSearchParam} SearchParam
	 */

	function validateSearchParam(v) {
		v.check('SearchParam', function(v) {
			v.or(function(v) {
				validateLocalSearchParam(v);
				validateServerSearchParam(v);
			});
		});
	}

	/**
	 * {@link DataAccessor} によるデータ検索のフェッチを行うためのパラメータを表す型です。
	 *
	 * @typedef {Object} FetchParam
	 */

	function validateFetchParam(v) {
		v.check('FetchParam', function(v) {
			v.notNull();
			v.plainObject();
		});
	}

	/**
	 * 1次元の検索結果のフェッチ可能な限界を表す型です。
	 *
	 * @typedef {Length} FetchLimit1D
	 */

	function validateFetchLimit1D(v) {
		v.check('FetchLimit1D', validateLength);
	}

	/**
	 * 検索結果のフェッチ可能な限界を表す型です。
	 *
	 * @typedef {FetchLimit1D} FetchLimit1D
	 */

	function validateFetchLimit(v) {
		v.check('FetchLimit', function(v) {
			v.or(function(v) {
				validateFetchLimit1D(v);
			});
		});
	}

	/**
	 * データ検索の初期データを表す型です。
	 *
	 * @typedef {Object} InitialData
	 * @property {FetchRange} fetchRange
	 * @property {boolean} isAllData
	 * @property {Array.<Data>} dataArray
	 */

	function validateInitialData(v) {
		v.check('InitialData', function(v) {
			v.notNull();
			v.plainObject();

			v.property('fetchRange', validateFetchRange);
			v.property('isAllData', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('dataArray', function(v) {
				v.notNull();
				v.array();
				v.values(validateData);
			});
		});
	}

	/**
	 * @typedef {Object} EditedInitialData
	 * @property {FetchRange} fetchRange
	 * @property {boolean} isAllData
	 * @property {Array.<EditedData>} dataArray
	 */

	function validateEditedInitialData(v) {
		v.check('EditedInitialData', function(v) {
			v.notNull();
			v.plainObject();

			v.property('fetchRange', validateFetchRange);
			v.property('isAllData', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('dataArray', function(v) {
				v.notNull();
				v.array();
				v.values(validateEditedData);
			});
		});
	}

	/**
	 * データ検索の結果を表す型です。
	 *
	 * @typedef {Object} SearchResult
	 * @property {FetchLimit} fetchLimit
	 * @property {FetchParam} fetchParam
	 * @property {InitialData=} initialData
	 */

	function validateSearchResult(v) {
		v.check('SearchResult', function(v) {
			v.notNull();
			v.plainObject();

			v.property('searchParam', validateSearchParam);
			v.property('fetchLimit', validateFetchLimit);
			v.property('fetchParam', validateFetchParam);
			v.property('initialData', function(v) {
				v.nullable();
				validateInitialData(v);
			});
		});
	}

	/**
	 * 編集を反映したデータ検索の結果を表す型です。
	 *
	 * @typedef {Object} EditedSearchResult
	 * @property {FetchLimit} fetchLimit
	 * @property {FetchParam} fetchParam
	 * @property {EditedInitialData=} initialData
	 */

	function validateEditedSearchResult(v) {
		v.check('EditedSearchResult', function(v) {
			v.notNull();
			v.plainObject();

			v.property('searchParam', validateSearchParam);
			v.property('fetchLimit', validateFetchLimit);
			v.property('fetchParam', validateFetchParam);
			v.property('initialData', function(v) {
				v.nullable();
				validateEditedInitialData(v);
			});
		});
	}


	/**
	 * 1次元の検索結果に対するフェッチの範囲指定を表す型です。
	 *
	 * @typedef {Object} FetchRange1D
	 * @property {Index} index 取得を開始する位置
	 * @property {Length} length 取得する長さ
	 */

	function validateFetchRange1D(v) {
		v.check('FetchRange1D', function(v) {
			v.notNull();
			v.plainObject();

			v.property('index', validateIndex);
			v.property('length', validateLength);
		});
	}

	// MEMO: スプレッドシートでは2次元の範囲指定があり得る
	/**
	 * フェッチの範囲指定を表す型です。
	 *
	 * @typedef {FetchRange1D} FetchRange
	 */

	function validateFetchRange(v) {
		v.check('FetchRange', function(v) {
			v.or(function(v) {
				validateFetchRange1D(v);
			});
		});
	}


	/**
	 * フェッチの結果を表す型です。
	 *
	 * @typedef {Object} FetchResult
	 * @property {FetchParam} fetchParam フェッチ条件
	 * @property {FetchRange} fetchRange フェッチ範囲
	 * @property {Array.<EditedData>} dataArray データの配列
	 */

	function validateFetchResult(v) {
		v.check('FetchResult', function(v) {
			v.notNull();
			v.plainObject();

			v.property('fetchParam', validateFetchParam);
			v.property('fetchRange', validateFetchRange);
			v.property('dataArray', function(v) {
				v.notNull();
				v.array();
				v.values(validateData);
			});
		});
	}

	/**
	 * 編集を反映したフェッチの結果を表す型です。
	 *
	 * @typedef {Object} EditedFetchResult
	 * @property {FetchParam} fetchParam フェッチ条件
	 * @property {FetchRange} fetchRange フェッチ範囲
	 * @property {Array.<EditedData>} dataArray 編集を反映したのデータの配列
	 */

	function validateEditedFetchResult(v) {
		v.check('EditedFetchResult', function(v) {
			v.notNull();
			v.plainObject();

			v.property('fetchParam', validateFetchParam);
			v.property('fetchRange', validateFetchRange);
			v.property('dataArray', function(v) {
				v.notNull();
				v.array();
				v.values(validateEditedData);
			});
		});
	}

	/**
	 * jQuery の ajax 関数に渡すことができる設定の型です。
	 *
	 * @typedef {Object} AjaxSetting
	 */

	function validateAjaxSetting(v) {
		v.check('AjaxSetting', function(v) {
			v.notNull();
			v.plainObject();
		});
	}

	/**
	 * @typedef {function(SearchParam): AjaxSetting} SearchAjaxSettingMaker
	 */

	function validateSearchAjaxSettingMaker(v) {
		v.check('SearchAjaxSettingMaker', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * @typedef {function(FetchParam, FetchRange): AjaxSetting} FetchAjaxSettingMaker
	 */

	function validateFetchAjaxSettingMaker(v) {
		v.check('FetchAjaxSettingMaker', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * @typedef {function(DataId): AjaxSetting} FindAjaxSettingMaker
	 */

	function validateFindAjaxSettingMaker(v) {
		v.check('FindAjaxSettingMaker', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * @typedef {function(Edit): AjaxSetting} CommitAjaxSettingMaker
	 */

	function validateCommitAjaxSettingMaker(v) {
		v.check('CommitAjaxSettingMaker', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * @typedef {function(*): SearchResult} SearchAjaxResultParser
	 */

	function validateSearchAjaxResultParser(v) {
		v.check('SearchAjaxResultParser', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * @typedef {function(*): FetchResult} FetchAjaxResultParser
	 */

	function validateFetchAjaxResultParser(v) {
		v.check('FetchAjaxResultParser', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * @typedef {function(*): Data} FindAjaxResultParser
	 */

	function validateFindAjaxResultParser(v) {
		v.check('FindAjaxResultParser', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * @typedef {function(*): *} CommitAjaxResultParser
	 */

	function validateCommitAjaxResultParser(v) {
		v.check('CommitAjaxResultParser', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * @typedef {Object} SearchAjaxParam
	 * @property {SearchAjaxSettingMaker} maker
	 * @property {SearchAjaxResultParser} parser
	 */

	function validateSearchAjaxParam(v) {
		v.check('SearchAjaxParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('request', validateSearchAjaxSettingMaker);
			v.property('response', validateSearchAjaxResultParser);
		});
	}

	/**
	 * @typedef {Object} FetchAjaxParam
	 * @property {FetchAjaxSettingMaker} maker
	 * @property {FetchAjaxResultParser} parser
	 */

	function validateFetchAjaxParam(v) {
		v.check('FetchAjaxParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('request', validateFetchAjaxSettingMaker);
			v.property('response', validateFetchAjaxResultParser);
		});
	}

	/**
	 * @typedef {Object} FindAjaxParam
	 * @property {FindAjaxSettingMaker} maker
	 * @property {FindAjaxResultParser} parser
	 */

	function validateFindAjaxParam(v) {
		v.check('FindAjaxParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('request', validateFindAjaxSettingMaker);
			v.property('response', validateFindAjaxResultParser);
		});
	}

	/**
	 * @typedef {Object} CommitAjaxParam
	 * @property {CommitAjaxSettingMaker} maker
	 * @property {CommitAjaxResultParser} parser
	 */

	function validateCommitAjaxParam(v) {
		v.check('CommitAjaxParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('request', validateCommitAjaxSettingMaker);
			v.property('response', validateCommitAjaxResultParser);
		});
	}

	/**
	 * データの編集ステータスを表す文字列です。
	 * <p>
	 * 以下の4つの値のどれかとなります。
	 * <ul>
	 * <li>unchanged: 変化なし</li>
	 * <li>added: 値が追加された</li>
	 * <li>updated: 値が更新された</li>
	 * <li>removed: データが削除された</li>
	 * </ul>
	 * </p>
	 *
	 * @typedef {string} EditStatusString
	 */

	function validateEditStatusString(v) {
		v.check('EditStatusString', function(v) {
			v.notNull();
			v.type('string');
			v.any(['unchanged', 'added', 'updated', 'removed']);
		});
	}

	/**
	 * ツリーに関して各データに付与するメタデータを表す型です。
	 *
	 * @typedef {Object} TreeMetadata
	 * @property {TreePath} path 自分から親を辿っていった dataId の配列
	 * @property {boolean} hasChild 子を持っているか
	 * @property {boolean} isOpenChild 子を開いているか
	 */

	function validateTreeMetadata(v) {
		v.check('TreeMetadata', function(v) {
			v.notNull();
			v.plainObject();

			v.property('path', validateTreePath);

			v.property('hasChild', function(v) {
				v.notNull();
				v.type('boolean');
			});

			v.property('isOpen', function(v) {
				v.notNull();
				v.type('boolean');
			});
		});
	}

	/**
	 * 編集結果を反映したデータの型です。
	 *
	 * @typedef {Object} EditedData
	 * @property {DataId} dataId データのID
	 * @property {EditStatusString} editStatus 編集ステータス
	 * @property {?Data} original 編集を反映する前のデータ
	 * @property {?Data} edited 編集を反映したデータ（削除された場合は null）
	 * @property {TreeMetadata=} tree ツリーに関するメタデータ
	 */

	function validateEditedData(v) {
		v.check('EditedData', function(v) {
			v.notNull();
			v.plainObject();

			v.property('dataId', validateDataId);
			v.property('editStatus', validateEditStatusString);
			v.property('original', function(v) {
				v.nullable(true);
				validateData(v);
			});
			v.property('edited', function(v) {
				v.nullable(true);
				validateData(v);
			});

			v.validate('original と edited が同時に null とならない', function(target) {
				return target.original !== null || target.edited !== null;
			});

			v.property('tree', function(v) {
				v.nullable();
				validateTreeMetadata(v);
			});
		});
	}

	/**
	 * データの追加を表現するイベントの型です。
	 *
	 * @typedef {Object} AddDataEvent
	 * @property {string} type "addData"
	 * @property {DataId} dataId データのID
	 * @property {Data} data 追加されたデータ
	 */

	function validateAddDataEvent(v) {
		v.check('AddDataEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('addData');
			});

			v.property('dataId', validateDataId);
			v.property('data', validateData);
		});
	}

	/**
	 * データの削除を表現するイベントの型です。
	 *
	 * @typedef {Object} RemoveDataEvent
	 * @property {string} type "removeData"
	 * @property {DataId} dataId データのID
	 * @property {Data} data 削除されたデータ
	 */

	function validateRemoveDataEvent(v) {
		v.check('RemoveDataEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('removeData');
			});

			v.property('dataId', validateDataId);
			v.property('data', validateData);
		});
	}

	/**
	 * データの値の変更を表現するイベントの型です。
	 *
	 * @typedef {Object} ReplaceValueEvent
	 * @property {string} type "replaceValue"
	 * @property {DataId} dataId データのID
	 * @property {PropertyName} propertyName プロパティ名
	 * @property {Value} originalValue 元データの値
	 * @property {Value} oldValue 置き換え前の値
	 * @property {Value} newValue 置き換え後の値
	 */

	function validateReplaceValueEvent(v) {
		v.check('ReplaceValueEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('replaceValue');
			});

			v.property('dataId', validateDataId);
			v.property('propertyName', validatePropertyName);
			v.property('originalValue', validateValue);
			v.property('oldValue', validateValue);
			v.property('newValue', validateValue);
		});
	}


	/**
	 * データに関する3種類の変更（Add,Remove,Replace）を表現するイベントの型です。
	 *
	 * @typedef {AddDataEvent|RemoveDataEvent|ReplaceValueEvent} ChangeDataEvent
	 * @property {Index=} index
	 */

	function validateChangeDataEvent(v) {
		v.check('ChangeDataEvent', function(v) {
			v.or(function(v) {
				validateAddDataEvent(v);
				validateRemoveDataEvent(v);
				validateReplaceValueEvent(v);
			});

			v.property('index', function(v) {
				v.nullable();
				validateIndex(v);
			});
		});
	}

	/**
	 * 一連の変更のタイプを表現する文字列です。
	 * <p>
	 * 以下の値どれかとなります。
	 * <ul>
	 * <li>edit: 編集によるデータの変更</li>
	 * <li>undo: UNDO操作によるデータの変更</li>
	 * <li>redo: REDO操作によるデータの変更</li>
	 * <li>unknown: 理由がわからないデータの変更（サーバなど）</li>
	 * </ul>
	 * </p>
	 *
	 * @typedef {string} ChangeTypeString
	 */

	function validateChangeTypeString(v) {
		v.check('ChangeTypeString', function(v) {
			v.notNull();
			v.type('string');
			v.any(['edit', 'undo', 'redo', 'unknown']);
		});
	}

	/**
	 * 編集による一連の変更を表現するイベントの型です。
	 *
	 * @typedef {Object} EditEvent
	 * @property {string} type "edit"
	 * @property {ChangeTypeString} changeType 変更のタイプ
	 * @property {Array.<ChangeDataEvent>} changes 変更の配列
	 */

	function validateEditEvent(v) {
		v.check('EditEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('edit');
			});

			v.property('changeType', validateChangeTypeString);

			v.property('changes', function(v) {
				v.notNull();
				v.array();
				v.values(validateChangeDataEvent);
			});
		});
	}

	/**
	 * 元データの一連の変更を表現するイベントの型です。
	 *
	 * @typedef {Object} ChangeSourceEvent
	 * @property {string} type "changeSource"
	 * @property {ChangeTypeString} changeType 変更のタイプ
	 * @property {Array.<ChangeDataEvent>} changes 変更の配列
	 */

	function validateChangeSourceEvent(v) {
		v.check('ChangeSourceEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('changeSource');
			});

			v.property('changeType', validateChangeTypeString);

			v.property('changes', function(v) {
				v.notNull();
				v.array();
				v.values(validateChangeDataEvent);
			});
		});
	}

	/**
	 * コミットが開始されたことを表すイベントの型です。
	 *
	 * @typedef {Object} CommitStartEvent
	 * @property {string} type "commitStart"
	 */

	/**
	 * コミットが成功したことを表すイベントの型です。
	 *
	 * @typedef {Object} CommitSuccessEvent
	 * @property {string} type "commitSuccess"
	 * @property {*} result コミットの結果
	 */

	/**
	 * コミットが失敗したことを表すイベントの型です。
	 *
	 * @typedef {Object} CommitErrorEvent
	 * @property {string} type "commitError"
	 */

	/**
	 * コミットが完了したことを表すイベントの型です。
	 * <p>
	 * このイベントはコミットの成否に関わらず発火されます。
	 * </p>
	 *
	 * @typedef {Object} CommitCompleteEvent
	 * @property {string} type "commitComplete"
	 */

	/**
	 * ロールバックが行われたことを表すイベントの型です。
	 *
	 * @typedef {Object} RollbackEvent
	 * @property {string} type "rollback"
	 */

	/**
	 * 検索の準備ができたことを表すイベントの型です。
	 *
	 * @typedef {Object} ReadySearchEvent
	 * @property {string} type "readySearch"
	 */

	/**
	 * 検索条件の変更を開始したことを表すイベントの型です。
	 *
	 * @typedef {Object} ChangeSearchStartEvent
	 * @property {string} type "changeSearchStart"
	 * @property {SearchParam} searchParam
	 */

	function validateChangeSearchStartEvent(v) {
		v.check('ChangeSearchStartEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('changeSearchStart');
			});

			v.property('searchParam', validateSearchParam);
		});
	}

	/**
	 * 検索条件の変更が成功したことを表すイベントの型です。
	 *
	 * @typedef {Object} ChangeSearchSuccessEvent
	 * @property {string} type "changeSearchSuccess"
	 * @property {SearchParam} searchParam
	 */

	function validateChangeSearchSuccessEvent(v) {
		v.check('ChangeSearchSuccessEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('changeSearchSuccess');
			});

			v.property('searchParam', validateSearchParam);
		});
	}

	/**
	 * 検索条件の変更が失敗したことを表すイベントの型です。
	 *
	 * @typedef {Object} ChangeSearchErrorEvent
	 * @property {string} type "changeSearchError"
	 * @property {SearchParam} searchParam
	 */

	function validateChangeSearchParamErrorEvent(v) {
		v.check('ChangeSearchErrorEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('changeSearchError');
			});

			v.property('searchParam', validateSearchParam);
		});
	}

	/**
	 * 検索条件の変更が完了したことを表すイベントの型です。
	 * <p>
	 * このイベントは検索条件変更の成否に関わらず発火されます。
	 * </p>
	 *
	 * @typedef {Object} ChangeSearchCompleteEvent
	 * @property {string} type "changeSearchComplete"
	 * @property {SearchParam} searchParam
	 */

	function validateChangeSearchCompleteEvent(v) {
		v.check('ChangeSearchCompleteEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('changeSearchComplete');
			});

			v.property('searchParam', validateSearchParam);
		});
	}

	/**
	 * 検索結果のリフレッシュが開始されたことを表すイベントの型です。
	 *
	 * @typedef {Object} RefreshSearchStartEvent
	 * @property {string} type "refreshSearchStart"
	 */

	/**
	 * 検索結果のリフレッシュが成功したことを表すイベントの型です。
	 *
	 * @typedef {Object} RefreshSearchSuccessEvent
	 * @property {string} type "refreshSearchSuccess"
	 */

	/**
	 * 検索結果のリフレッシュが失敗したことを表すイベントの型です。
	 *
	 * @typedef {Object} RefreshSearchErrorEvent
	 * @property {string} type "refreshSearchError"
	 */

	/**
	 * 検索結果のリフレッシュが完了したことを表すイベントの型です。
	 * <p>
	 * このイベントはリフレッシュの成否に関わらず発火されます。
	 * </p>
	 *
	 * @typedef {Object} RefreshSearchCompleteEvent
	 * @property {string} type "refreshSearchComplete"
	 */


	/**
	 * ツリー構造の位置を表現するパスを表す型です。
	 *
	 * @typedef {Array.<DataId>} TreePath
	 */

	function validateTreePath(v) {
		v.check('TreePath', function(v) {
			v.notNull();
			v.array();

			v.values(validateDataId);
		});
	}

	/**
	 * JSON Patch の path を表す型です。
	 * <p>
	 * 先頭に必ずスラッシュがあります。
	 * </p>
	 *
	 * @typedef {string} PatchPath
	 */

	function validatePatchPath(v) {
		v.check('PatchPath', function(v) {
			v.notNull();
			v.type('string');
			v.match(/^\//);
		});
	}

	/**
	 * JSON Patch の add を表現する型です。
	 *
	 * @typedef {Object} AddPatch
	 * @property {string} op "add"
	 * @property {PatchPath} path 追加するパス
	 * @property {Value} value 追加する値
	 */

	function validateAddPatch(v) {
		v.check('AddPatch', function(v) {
			v.notNull();
			v.plainObject();

			v.property('op', function(v) {
				v.notNull();
				v.type('string');
				v.equal('add');
			});

			v.property('path', validatePatchPath);
			v.property('value', validateValue);
		});
	}

	/**
	 * JSON Patch の remove を表す型です。
	 *
	 * @typedef {Object} RemovePatch
	 * @property {string} op "remove"
	 * @property {PatchPath} path
	 */

	function validateRemovePatch(v) {
		v.check('RemovePatch', function(v) {
			v.notNull();
			v.plainObject();

			v.property('op', function(v) {
				v.notNull();
				v.type('string');
				v.equal('remove');
			});

			v.property('path', validatePatchPath);
		});
	}

	/**
	 * JSON Patch の replace を表す型です。
	 *
	 * @typedef {Object} ReplacePatch
	 * @property {string} op "replace"
	 * @property {PatchPath} path 置き換えるパス
	 * @property {Value} value 置き換える値
	 */

	function validateReplacePatch(v) {
		v.check('RemovePatch', function(v) {
			v.notNull();
			v.plainObject();

			v.property('op', function(v) {
				v.notNull();
				v.type('string');
				v.equal('replace');
			});

			v.property('path', validatePatchPath);
			v.property('value', validateValue);
		});
	}

	/**
	 * JSON Patch の test を表す型です。
	 *
	 * @typedef {Object} TestPatch
	 * @property {string} op "test"
	 * @property {PatchPath} path テストするパス
	 * @property {Value} value 期待する値
	 */

	function validateTestPatch(v) {
		v.check('TestPatch', function(v) {
			v.notNull();
			v.plainObject();

			v.property('op', function(v) {
				v.notNull();
				v.type('string');
				v.equal('test');
			});

			v.property('path', validatePatchPath);
			v.property('value', validateValue);
		});
	}

	/**
	 * JSON Patch のひとつのパッチを表す型です。
	 *
	 * @typedef {AddPatch|RemovePatch|ReplacePatch|TestPatch} Patch
	 */

	function validatePatch(v) {
		v.check('Patch', function(v) {
			v.or(function(v) {
				validateAddPatch(v);
				validateRemovePatch(v);
				validateReplacePatch(v);
				validateTestPatch(v);
			});
		});
	}


	/**
	 * データへの参照を表現する型です。
	 *
	 * @typedef {Object} DataReference
	 * @property {boolean} isLoaded ロード済みであるか否か
	 * @property {?EditedData} data データ
	 */

	function validateLoadedDataReference(v) {
		v.check('LoadedDataReference', function(v) {
			v.notNull();
			v.plainObject();

			v.property('isLoaded', function(v) {
				v.notNull();
				v.equal(true);
			});

			v.property('data', validateEditedData);
		});
	}

	function validateNotLoadedDataReference(v) {
		v.check('NotLoadedDataReference', function(v) {
			v.notNull();
			v.plainObject();

			v.property('isLoaded', function(v) {
				v.notNull();
				v.equal(false);
			});

			v.property('data', function(v) {
				v.equal(null);
			});
		});
	}


	function validateDataReference(v) {

		v.check('DataReference', function(v) {
			v.or(function(v) {
				validateLoadedDataReference(v);
				validateNotLoadedDataReference(v);
			});
		});
	}

	/**
	 * ローカルでの検索されたデータの型です。
	 * <p>
	 * tree の設定によって treePath を付与するための型になります。
	 * </p>
	 *
	 * @typedef {Object} LocalSearchedData
	 * @property {DataId} dataId
	 * @property {Data} data
	 * @property {TreeMetadata=} tree
	 */

	function validateLocalSearchedData(v) {
		v.check('LocalSearchedData', function(v) {
			v.notNull();
			v.plainObject();

			v.property('dataId', validateDataId);
			v.property('data', validateData);

			v.property('tree', function(v) {
				v.nullable();
				validateTreeMetadata(v);
			});
		});
	}

	/**
	 * 参照するデータIDの変更を開始したことを表すイベントの型です。
	 *
	 * @typedef {Object} ChangeDataIdStartEvent
	 * @property {string} type "changeDataIdStart"
	 * @property {DataId} dataId データのID
	 */

	function validateChangeDataIdStartEvent(v) {
		v.notNull();
		v.plainObject();

		v.property('type', function(v) {
			v.notNull();
			v.type('string');
			v.equal('changeDataIdStart');
		});

		v.property('dataid', validateDataId);
	}

	/**
	 * 参照するデータIDの変更が成功したことを表すイベントの型です。
	 *
	 * @typedef {Object} ChangeDataIdSuccessEvent
	 * @property {DataId} dataId データのID
	 */

	function validateChangeDataIdSuccessEvent(v) {
		v.notNull();
		v.plainObject();

		v.property('type', function(v) {
			v.notNull();
			v.type('string');
			v.equal('changeDataIdSuccess');
		});

		v.property('dataid', validateDataId);
	}

	/**
	 * 参照するデータIDの変更が失敗したことを表すイベントの型です。
	 *
	 * @typedef {Object} ChangeDataIdErrorEvent
	 * @property {DataId} dataId データのID
	 */

	function validateChangeDataIdErrorEvent(v) {
		v.notNull();
		v.plainObject();

		v.property('type', function(v) {
			v.notNull();
			v.type('string');
			v.equal('changeDataIdError');
		});

		v.property('dataid', validateDataId);
	}

	/**
	 * 参照するデータIDの変更が完了したことを表すイベントの型です。
	 * <p>
	 * このイベントは変更の成否にかかわらず発火します。
	 * </p>
	 *
	 * @typedef {Object} ChangeDataIdCompleteEvent
	 * @property {DataId} dataId データのID
	 */

	function validateChangeDataIdCompleteEvent(v) {
		v.notNull();
		v.plainObject();

		v.property('type', function(v) {
			v.notNull();
			v.type('string');
			v.equal('changeDataIdComplete');
		});

		v.property('dataid', validateDataId);
	}

	/**
	 * スクロール位置を表す型です。
	 *
	 * @typedef {number} ScrollPosition
	 */

	function validateScrollPosition(v) {
		v.check('ScrollPosition', function(v) {
			v.notNull();
			v.type('number');
			v.integer();
			v.min(0);
		});
	}


	/**
	 * ピクセル数によって表現されたサイズの型です。
	 *
	 * @typedef {number} PixelSize
	 */

	function validatePixelSize(v) {
		v.check('PixelSize', function(v) {
			v.notNull();
			v.type('number');
			v.integer();
			v.min(0);
		});
	}


	/**
	 * ピクセル数によって表現された位置の型です。
	 *
	 * @typedef {number} PixelPosition
	 */

	function validatePixelPosition(v) {
		v.check('PixelPosition', function(v) {
			v.notNull();
			v.type('number');
			v.integer();
		});
	}

	/**
	 * 表示位置を表現する型です。
	 * <p>
	 * {@link PixelPostion} に加えて最後であることを示す文字列 "last" を含む型となります。
	 * </p>
	 *
	 * @typedef {string|PixelPosition} DisplayPosition
	 */

	function validateDisplayPosition(v) {
		v.check('DisplayPosition', function(v) {
			v.or(function(v) {
				validatePixelPosition(v);
				v.equal('last');
			});
		});
	}


	/**
	 * データ選択の結果を表す型です。
	 *
	 * @typedef {Object} DataSelectResult
	 * @property {boolean} isDefaultUnselected デフォルトで選択解除状態であれば true、選択状態であれば false
	 * @property {Array.<DataId>} invertedIds デフォルトと逆の状態となっている dataId の配列
	 */

	function validateDataSelectResult(v) {
		v.check('DataSelectResult', function(v) {
			v.notNull();
			v.plainObject();

			v.property('isDefaultUnselected', function(v) {
				v.notNull();
				v.type('boolean');
			});

			v.property('invertedIds', function(v) {
				v.notNull();
				v.array();
				v.values(validateDataId);
			});
		});
	}


	/**
	 * ひとつのセルの位置を表す型です。
	 *
	 * @typedef {Object} CellPosition
	 * @property {Index} row
	 * @property {Index} column
	 */

	function validateCellPosition(v) {
		v.check('CellPosition', function(v) {
			v.notNull();
			v.plainObject();

			v.property('row', validateIndex);
			v.property('column', validateIndex);
		});
	}

	/**
	 * 複数のセルの範囲を表す型です。
	 *
	 * @typedef {Object} CellRange
	 * @property {Index} rowIndex
	 * @property {Length} rowLength
	 * @property {Index} columnIndex
	 * @property {Length} columnLength
	 */

	function validateCellRange(v) {
		v.check('CellRange', function(v) {
			v.notNull();
			v.plainObject();

			v.property('rowIndex', validateIndex);
			v.property('rowLength', validateLength);
			v.property('columnIndex', validateIndex);
			v.property('columnLength', validateLength);
		});
	}


	/**
	 * セルに対する選択が変更されたことを表すイベントの型です。
	 *
	 * @typedef {Object} ChangeCellSelectEvent
	 * @property {string} type "changeCellSelect"
	 * @property {CellPosition} focusedCell フォーカスされているセル
	 * @property {CellRange} selectedRange 選択されているセルの範囲
	 */

	function validateChangeCellSelectEvent(v) {
		v.check('ChangeCellSelectEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('changeCellSelect');
			});
			v.property('focusedCell', validateCellPosition);
			v.property('selectedRange', validateCellRange);
		});
	}

	/**
	 * サイズを保存する際に紐付けるキーとなる型です。
	 * <p>
	 * 実際には {@link DataId} や {@link PropertyName} などが割り当たる想定です。
	 * </p>
	 *
	 * @typedef {string} SizeKey
	 */

	function validateSizeKey(v) {
		v.check('SizeKey', function(v) {
			v.notNull();
			v.type('string');
		});
	}

	/**
	 * 表示に必要な範囲を表現する型です。
	 *
	 * @typedef {Object} DisplayRange
	 * @property {Index} index
	 * @property {Length} length
	 * @property {DisplayPosition} displayPosition
	 */

	function validateDisplayRange(v) {
		v.check('DisplayRange', function(v) {
			v.notNull();
			v.plainObject();

			v.property('index', validateIndex);
			v.property('length', validateLength);
			v.property('displayPosition', validateDisplayPosition);
		});
	}


	/**
	 * 方向を表す文字列です。
	 * <p>
	 * 以下の値のどちらかとなります。
	 * <ul>
	 * <li>vertical</li>
	 * <li>horizontal</li>
	 * </ul>
	 * </p>
	 *
	 * @typedef {string} DirectionString
	 */

	function validateDirectionString(v) {
		v.check('DirectionString', function(v) {
			v.notNull();
			v.type('string');
			v.any(['vertical', 'horizontal']);
		});
	}


	/**
	 * @typedef {function(GridCell): *} ToValueFunction
	 */

	function validateToValueFunction(v) {
		v.check('ToValueFunction', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * @typeof {function(GridCell): Array.<*>} ToCopyValuesFunction
	 */

	function validateToCopyValuesFunction(v) {
		v.check('ToCopyValues', function(v) {
			v.notNull();
			v.func();
		});
	}


	/**
	 * @typedef {Object} MapperPropertyDefinition
	 * @property {Value=} headerValue
	 * @property {PixelSize=} [size]
	 * @property {boolean=} [enableResize]
	 * @property {ToValueFunction=} [toValue]
	 */

	function validateMapperPropertyDefinition(v) {
		v.check('MapperPropertyDefinition', function(v) {
			v.notNull();
			v.plainObject();

			v.property('headerValue', function(v) {
				v.nullable();
				validateValue(v);
			});

			v.property('size', function(v) {
				v.nullable();
				validatePixelSize(v);
			});

			v.property('enableResize', function(v) {
				v.nullable();
				v.type('boolean');
			});

			v.property('toValue', function(v) {
				v.nullable();
				validateToValueFunction(v);
			});

			v.property('toCopyValues', function(v) {
				v.nullable();
				validateToCopyValuesFunction(v);
			});
		});
	}


	/**
	 * @typedef {Object} VisibleProperties
	 * @property {Array.<PropertyName>} header
	 * @property {Array.<PropertyName>} main
	 */

	function validateVisibleProperties(v) {
		v.check('VisibleProperties', function(v) {
			v.notNull();
			v.plainObject();

			v.property('header', function(v) {
				v.notNull();
				v.array();
				v.values(validatePropertyName);
			});

			v.property('main', function(v) {
				v.notNull();
				v.array();
				v.values(validatePropertyName);
			});
		});
	}



	/**
	 * @typedef {Object} PropertyDirectionSizeParam
	 * @property {PixelSize} defaultSize
	 * @property {boolean} [enableResize=true]
	 * @property {PixelSize=} [minSize]
	 * @property {PixelSize=} [maxSize]
	 */

	function validatePropertyDirectionSizeParam(v) {
		v.check('PropertyDirectionSizeParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('defaultSize', validatePixelSize);
			v.property('enableResize', function(v) {
				v.nullable();
				v.type('boolean');
			});
			v.property('minSize', function(v) {
				v.nullable();
				validatePixelSize(v);
			});
			v.property('maxSize', function(v) {
				v.nullable();
				validatePixelSize(v);
			});
		});
	}

	/**
	 * @typedef {Object} DataDirectionSizeParam
	 * @property {PixelSize} size
	 */

	function validateDataDirectionSizeParam(v) {
		v.check('DataDirectionSizeParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('size', validatePixelSize);
		});
	}


	/**
	 * @typedef {Object.<PropertyName, ?PropertyHierarchy>} PropertyHierarchy
	 */

	function validatePropertyHierarchy(v) {
		v.check('PropertyHierarchy', function(v) {
			v.notNull();
			v.plainObject();

			v.keys(validatePropertyName);
			v.values(function(v) {
				v.nullable(true);
				validatePropertyHierarchy(v);
			});
		});
	}

	/**
	 * @typedef {Object} PropertyGridDataMapperParam
	 * @property {DirectionString} direction
	 * @property {Object.<PropertyName, MapperPropertyDefinition>} propertyDefinition
	 * @property {VisibleProperties} visibleProperties
	 * @property {PropertyDirectionSizeParam} propertyDirectionSize
	 * @property {DataDirectionSizeParam} dataDirectionSize
	 * @property {PropertyHierarchy} propertyHierarchy
	 */

	function validatePropertyGridDataMapperParam(v) {
		v.check('PropertyGridDataMapperParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('direction', validateDirectionString);
			v.property('propertyDefinition', function(v) {
				v.notNull();
				v.plainObject();

				v.keys(validatePropertyName);
				v.values(validateMapperPropertyDefinition);
			});
			v.property('visibleProperties', validateVisibleProperties);
			v.property('propertyDirectionSize', validatePropertyDirectionSizeParam);
			v.property('dataDirectionSize', validateDataDirectionSizeParam);
			v.property('propertyHierarchy', validatePropertyHierarchy);
		});
	}

	// TODO いろいろ追加


	/**
	 * CSS における class名 を表す型です。
	 *
	 * @typedef {string} ClassName
	 */

	function validateClassName(v) {
		v.check('PropertyName', function(v) {
			v.notNull();
			v.type('string');
			v.match(/^[-_a-zA-Z0-9]+$/);
		});
	}

	/**
	 * @typedef {Object} GridBorder
	 * @property {Array.<string>} classes
	 * @property {PixelSize} width
	 */

	function validateGridBorder(v) {
		v.check('GridBorder', function(v) {
			v.notNull();
			v.plainObject();

			v.property('classes', function(v) {
				v.notNull();
				v.array();
				v.values(validateClassName);
			});

			v.property('width', validatePixelSize);
		});
	}


	/**
	 * @typedef {Object} GridCell
	 * @property {Index} index
	 * @property {DataId} dataId
	 * @property {PropertyName} propertyName
	 * @property {Index} row
	 * @property {Index} column
	 * @property {Length} rowSpan
	 * @property {Length} colSpan
	 * @property {boolean} isLoaded
	 * @property {boolean} isHeaderRow
	 * @property {boolean} isHeaderColumn
	 * @property {boolean} isFocusedData
	 * @property {boolean} isSelectedData
	 * @property {boolean} isFocusedCell
	 * @property {boolean} isSelectedCell
	 * @property {TreeMetadata} tree
	 * @property {string} rowHeightKey
	 * @property {string} columnWidthKey
	 * @property {EditStatusString} editStatus
	 * @property {Data} originalData
	 * @property {Data} editedData
	 * @property {Value} originalValue
	 * @property {Value} editedValue
	 */

	function validateGridCell(v) {
		v.check('GridCell', function(v) {
			v.notNull();
			v.plainObject();

			v.property('index', function(v) {
				v.nullable();
				validateIndex(v);
			});
			v.property('dataId', function(v) {
				v.nullable();
				validateDataId(v);
			});
			v.property('propertyName', validatePropertyName);
			v.property('row', validateIndex);
			v.property('column', validateIndex);
			v.property('rowSpan', validateLength);
			v.property('colSpan', validateLength);
			v.property('isLoaded', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('isHeaderRow', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('isHeaderColumn', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('isFocusedData', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('isSelectedData', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('isFocusedCell', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('isSelectedCell', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('tree', function(v) {
				v.nullable();
				validateTreeMetadata(v);
			});

			v.property('rowHeightKey', function(v) {
				v.nullable();
				v.type('string');
			});
			v.property('columnWidthKey', function(v) {
				v.nullable();
				v.type('string');
			});

			v.property('editStatus', function(v) {
				v.nullable();
				validateEditStatusString(v);
			});
			v.property('originalData', function(v) {
				v.nullable();
				validateData(v);
			});
			v.property('editedData', function(v) {
				v.nullable();
				validateData(v);
			});
			v.property('originalValue', function(v) {
				v.nullable();
				validateValue(v);
			});
			v.property('editedValue', function(v) {
				v.nullable();
				validateValue(v);
			});
		});
	}


	/**
	 * @typedef {string} GridRegionName
	 */

	function validateGridRegionName(v) {
		v.check('GridRegionName', function(v) {
			v.notNull();
			v.type('string');
			v.match(/^[-_a-zA-Z0-9]+$/);
		});
	}

	/**
	 * @typedef {Object.<GridRegionName, CellRange>} GridRequestParam
	 */

	function validateGridRequestParam(v) {
		v.check('GridRequestParam', function(v) {
			v.notNull();
			v.plainObject();

			v.keys(validateGridRegionName);
			v.values(validateCellRange);
		});
	}

	/**
	 * @typedef {Object} PropertyHeaderBaseCell
	 * @property {boolean} isBaseCell true
	 * @property {Length} dataSpan
	 * @property {Length} propertySpan
	 * @property {PropertyName} property
	 */

	function validatePropertyHeaderBaseCell(v) {
		v.check('PropertyHeaderBaseCell', function(v) {
			v.notNull();
			v.plainObject();

			v.property('isBaseCell', function(v) {
				v.notNull();
				v.type('boolean');
				v.equal(true);
			});
			v.property('dataSpan', validateLength);
			v.property('propertySpan', validateLength);
			v.property('property', validatePropertyName);
		});
	}

	/**
	 * @typedef {Object} PropertyHeaderBlankCell
	 * @property {boolean} isBaseCell false
	 * @property {Length} dataOffset
	 * @property {Length} propertyOffset
	 */

	function validatePropertyHeaderBlankCell(v) {
		v.check('PropertyHeaderBlankCell', function(v) {
			v.notNull();
			v.plainObject();

			v.property('isBaseCell', function(v) {
				v.notNull();
				v.type('boolean');
				v.equal(false);
			});
			v.property('dataOffset', validateLength);
			v.property('propertyOffset', validateLength);
		});
	}

	/**
	 * @typedef {PropertyHeaderBaseCell|PropertyHeaderBlankCell} PropertyHeaderCell
	 */

	function validatePropertyHeaderCell(v) {
		v.check('PropertyHeaderCell', function(v) {
			v.or(function(v) {
				validatePropertyHeaderBaseCell(v);
				validatePropertyHeaderBlankCell(v);
			});
		});
	}

	/**
	 * {@link GridLogic} の準備ができたことを表すイベントの型です。
	 *
	 * @typedef {Object} ReadyGridLogicEvent
	 * @property {string} type "readyGridLogic"
	 */


	// TODO: 行追加なども追加する
	/**
	 * グリッドに関するひとつの変更を表す型です。
	 *
	 * @typedef {ChangeSourceEvent|EditEvent|RollbackEvent|ChangeRowHeightEvent|ChangeColumnWidthEvent|ChangeDataSelectEvent|ChangeCellSelectEvent|ChangePropertyEvent}
	 *          GridChange
	 */

	function validateGridChange(v) {
		v.check('GridChange', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
			});
		});
	}

	/**
	 * グリッドに変更があったことを表すイベントの型です。
	 * <p>
	 * このイベントは変更とは非同期に発生し、一回のイベントループで発生した変更をまとめて通知します。
	 * </p>
	 *
	 * @typedef {Object} ChangeGridEvent
	 * @property {string} type "changeGrid"
	 * @property {Array.<GridChange>} changes 一連の変更を表す配列
	 */

	function validateChangeGridEvent(v) {
		v.check('ChangeGridEvent', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', function(v) {
				v.notNull();
				v.type('string');
				v.equal('changeGrid');
			});

			v.property('changes', function(v) {
				v.notNull();
				v.array();
				v.values(validateGridChange);
			});
		});
	}

	/**
	 * Searcher のタイプを表す文字列の型です。
	 * <p>
	 * 以下の3つのどれかの値となります。
	 * <ul>
	 * <li>all</li>
	 * <li>eager</li>
	 * <li>lazy</li>
	 * </ul>
	 * </p>
	 *
	 * @typedef {string} SearcherTypeString
	 */

	function validateSearcherTypeString(v) {
		v.check('SearcherTypeString', function(v) {
			v.notNull();
			v.type('string');
			v.any(['all', 'eager', 'lazy']);
		});
	}

	/**
	 * @typedef {Object} SearcherParam
	 * @proeprty {SearcherTypeString} type
	 */

	function validateSearcherParam(v) {
		v.check('SearcherParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', validateSearcherTypeString);
			// TODO: Configurator について考える
			//			v.property('configurator', function(v) {
			//				v.notNull();
			//				v.plainObject();
			//			});
		});
	}

	/**
	 * Mapper のタイプを表す文字列の型です。
	 * <p>
	 * 以下のどれかの値となります。
	 * <ul>
	 * <li>property</li>
	 * </ul>
	 * </p>
	 *
	 * @typedef {string} MapperTypeString
	 */

	function validateMapperTypeString(v) {
		v.check('MapperTypeString', function(v) {
			v.notNull();
			v.type('string');
			v.any(['property']);
		});
	}

	/**
	 * Mapper の設定用パラメータを表す型です。
	 *
	 * @typedef {Object} MapperParam
	 * @property {MapperTypeString} type
	 * @property {Object} param
	 */

	function validateMapperParam(v) {
		v.check('MapperParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('type', validateMapperTypeString);
			v.property('param', function(v) {
				v.notNull();
				v.plainObject();
			});
		});
	}

	/**
	 * Scroll方法のタイプを表す文字列の型です。
	 * <p>
	 * 以下の2つのどれかの値となります。
	 * <ul>
	 * <li>index</li>
	 * <li>pixel</li>
	 * </ul>
	 * </p>
	 *
	 * @typedef {string} ScrollTypeString
	 */

	function validateScrollTypeString(v) {
		v.check('ScrollTypeString', function(v) {
			v.notNull();
			v.type('string');
			v.any(['index', 'pixel']);
		});
	}

	/**
	 * Scroll方法のパラメータを表す型です。
	 *
	 * @typedef {Object} ScrollParam
	 * @property {ScrollTypeString} vertical
	 * @property {ScrollTypeString} horizontal
	 */

	function validateScrollParam(v) {
		v.check('ScrollParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('vertical', validateScrollTypeString);
			v.property('horizontal', validateScrollTypeString);
		});
	}

	/**
	 * {@link GridLogic} の初期化で渡すパラメータの型です。
	 *
	 * @typedef {Object} GridLogicParam
	 * @property {SearcherTypeString} searcher
	 * @property {MapperParam} mapper
	 * @property {ScrollParam} scroll
	 */

	function validateGridLogicParam(v) {
		v.check('GridLogicParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('searcher', validateSearcherParam);
			v.property('mapper', validateMapperParam);
			v.property('scroll', validateScrollParam);
		});
	}

	/**
	 * セルのデータからセルの表示HTMLに変換するフォーマッタの型です。
	 *
	 * @typedef {function(GridCell, boolean, PixelSize, PixelSize): string} CellFormatter
	 */

	function validateCellFormatter(v) {
		v.check('CellFormatter', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * セルのイベントハンドラを表す型です。
	 *
	 * @typedef {function(Context, JQueryObject)} CellEventHandler
	 */

	function validateCellEventHandler(v) {
		v.check('CellEventHandler', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * 文字列 'partialMatch' です。
	 * <p>
	 * ユーザに部分一致文字列をフィルタ条件として入力させる UI とするパラメータです。
	 * </p>
	 *
	 * @typedef {string} PartialMatchFilterUIString
	 */

	function validatePartialMatchFilterUIString(v) {
		v.check('PartialMatchFilterUIString', function(v) {
			v.equal('partialMatch');
		});
	}

	/**
	 * 文字列 'distinctValues' です。
	 * <p>
	 * そのプロパティにおいて、存在する値の集合からフィルタ条件をユーザに選択させる UI とするパラメータです。 <br>
	 * データを遅延ロードしている場合に選択することはできません。
	 * </p>
	 *
	 * @typedef {string} DistinctValuesFilterUIString
	 */

	function validateDistinctValuesFilterUIString(v) {
		v.check('DistinctValuesFilterUIString', function(v) {
			v.equal('distinctValues');
		});
	}

	/**
	 * フィルタ可能な値の配列を表す型です。
	 *
	 * @typedef {Array.<Value>} ValueArrayFilterUIParam
	 */

	function validateValueArrayFilterUIParam(v) {
		v.check('ValueArrayFilterUIParam', function(v) {
			v.notNull();
			v.array();
			v.values(validateValue);
		});
	}

	/**
	 * フィルタ条件をどういった形でユーザに指定してもらうかの UI を選択するためのパラメータの型です。
	 * <p>
	 * 以下のパターンのいずれかで指定することができます。
	 * <ul>
	 * <li>'partialMatch': ユーザに部分一致文字列を入力してもらう UI</li>
	 * <li>'distinctValues': 存在する値の集合から選択してもらう UI</li>
	 * <li>値の配列: 指定した配列の値から選択してもらう UI</li>
	 * </ul>
	 * </p>
	 *
	 * @typedef {PartialMatchFilterUIString|DistinctValuesFilterUIString|ValueArrayFilterUIParam}
	 *          FilterUIParam
	 */

	function validateFilterUIParam(v) {
		v.check('FilterUIParam', function(v) {
			v.or(function(v) {
				validatePartialMatchFilterUIString(v);
				validateDistinctValuesFilterUIString(v);
				validateValueArrayFilterUIParam(v);
			});
		});
	}

	/**
	 * プロパティごとのUI上の設定を表す型です。
	 *
	 * @typedef {Object} PropertyUIParam
	 * @property {CellFormatter=} formatter
	 * @property {CellEventHandler=} changeHandler
	 * @property {boolean=} sortable
	 * @property {PropertyName=} sortProperty
	 * @property {FilterUIParam=} filter
	 */

	function validatePropertyUIParam(v) {
		v.check('PropertyUIParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('formatter', function(v) {
				v.nullable();
				validateCellFormatter(v);
			});


			v.property('changeHandler', function(v) {
				v.nullable();
				validateCellEventHandler(v);
			});

			v.property('sortable', function(v) {
				v.nullable();
				v.type('boolean');
			});

			v.property('sortProperty', function(v) {
				v.nullable();
				validatePropertyName(v);
			});

			v.property('filter', function(v) {
				v.nullable();
				validateFilterUIParam(v);
			});
		});
	}

	/**
	 * セルにクラスを追加するか判断するための関数を表す型です。
	 *
	 * @typedef {function(GridCell): boolean> CellClassPredicate
	 */

	function validateCellClassPredicate(v) {
		v.check('CellClassPredicate', function(v) {
			v.notNull();
			v.func();
		});
	}

	/**
	 * 各セルにあてるクラスを決めるための設定を表す型です。
	 *
	 * @typedef {Object.<string, CellClassPredicate>} CellClassDefinition
	 */

	function validateCellClassDefinition(v) {
		v.check('CellClassDefinition', function(v) {
			v.notNull();
			v.plainObject();

			v.keys(function(v) {
				v.notNull();
				v.type('string');
			});
			v.values(validateCellClassPredicate);
		});
	}

	/**
	 * グリッド領域のサイズを表す型です。
	 * <p>
	 * 文字列としては以下の値を指定することができます。
	 * <ul>
	 * <li>css: CSSで設定された値をそのまま利用する</li>
	 * </ul>
	 * </p>
	 *
	 * @typedef {string|number} GridAreaSize
	 */

	function validateGridAreaSize(v) {
		v.check('GridAreaSize', function(v) {
			v.notNull();
			v.or(function(v) {
				v.any(['css']);
				validatePixelSize(v);
			});
		});
	}

	/**
	 * 入力を disabled にするかを判別する関数の型です。
	 *
	 * @typedef {function(GridCell): boolean} DisableInputPredicate
	 */

	/**
	 * {@link TableGridViewController} の設定を表す型です。
	 *
	 * @typedef {Object} TableGridViewControllerParam
	 * @property {GridAreaSize} gridHeight
	 * @property {GridAreaSize} gridWidth
	 * @property {boolean} enableResizeColumnUI: true
	 * @property {boolean} enableReorderColumnUI: true
	 * @property {boolean} enableColumnSortAndFilterUI: true
	 * @property {Array.<string>=} [sortAscIconClasses]
	 * @property {Array.<string>=} [sortDescIconClasses]
	 * @property {Array.<string>=} [sortClearIconClasses]
	 * @property {CellFormatter} defaultFormatter
	 * @property {CellClassDefinition} cellClassDefinition
	 * @property {DisableInputPredicate} disableInput
	 * @property {Object.<PropertyName, PropertyUIParam>} propertyUI
	 */

	function validateTableGridViewControllerParam(v) {
		v.check('TableGridViewControllerParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('gridHeight', validateGridAreaSize);
			v.property('gridWidth', validateGridAreaSize);

			v.property('enableResizeColumnUI', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('enableReorderColumnUI', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('enableColumnSortAndFilterUI', function(v) {
				v.notNull();
				v.type('boolean');
			});
			v.property('sortAscIconClasses', function(v) {
				v.notNull();
				v.array();
				v.values(function(v) {
					v.notNull();
					v.type('string');
				});
			});
			v.property('sortDescIconClasses', function(v) {
				v.notNull();
				v.array();
				v.values(function(v) {
					v.notNull();
					v.type('string');
				});
			});
			v.property('sortClearIconClasses', function(v) {
				v.notNull();
				v.array();
				v.values(function(v) {
					v.notNull();
					v.type('string');
				});
			});

			v.property('defaultFormatter', validateCellFormatter);
			v.property('cellClassDefinition', validateCellClassDefinition);
			v.property('disableInput', function(v) {
				v.nullable();
				v.func();
			});

			v.property('propertyUI', function(v) {
				v.notNull();
				v.plainObject();

				v.keys(validatePropertyName);
				v.values(validatePropertyUIParam);
			});

			// TODO: tree の追加
		});
	}


	//=============================
	// Variables
	//=============================
	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/** @lends h5.ui.components.datagrid.type */
	var exports = {
		validateIndex: validateIndex,
		validateLength: validateLength,
		validateData: validateData,
		validateValue: validateValue,
		validateDataId: validateDataId,
		validatePropertyName: validatePropertyName,
		validateDataSet: validateDataSet,

		validateDataFilterPredicate: validateDataFilterPredicate,
		validateValueFilterPredicate: validateValueFilterPredicate,
		validateLocalValueFilterParam: validateLocalValueFilterParam,
		validateLocalFilterParam: validateLocalFilterParam,
		validateOrderString: validateOrderString,
		validateSortParam: validateSortParam,
		validateTreeParam: validateTreeParam,
		validateLocalSearchParam: validateLocalSearchParam,
		validateServerSearchParam: validateServerSearchParam,

		validateSearchParam: validateSearchParam,
		validateFetchParam: validateFetchParam,
		validateFetchLimit1D: validateFetchLimit1D,
		validateFetchLimit: validateFetchLimit,
		validateInitialData: validateInitialData,
		validateEditedInitialData: validateEditedInitialData,
		validateSearchResult: validateSearchResult,
		validateEditedSearchResult: validateEditedSearchResult,
		validateFetchRange1D: validateFetchRange1D,
		validateFetchRange: validateFetchRange,
		validateFetchResult: validateFetchResult,
		validateEditedFetchResult: validateEditedFetchResult,

		validateAjaxSetting: validateAjaxSetting,
		validateSearchAjaxSettingMaker: validateSearchAjaxSettingMaker,
		validateFetchAjaxSettingMaker: validateFetchAjaxSettingMaker,
		validateFindAjaxSettingMaker: validateFindAjaxSettingMaker,
		validateCommitAjaxSettingMaker: validateCommitAjaxSettingMaker,
		validateSearchAjaxResultParser: validateSearchAjaxResultParser,
		validateFetchAjaxResultParser: validateFetchAjaxResultParser,
		validateFindAjaxResultParser: validateFindAjaxResultParser,
		validateCommitAjaxResultParser: validateCommitAjaxResultParser,
		validateSearchAjaxParam: validateSearchAjaxParam,
		validateFetchAjaxParam: validateFetchAjaxParam,
		validateFindAjaxParam: validateFindAjaxParam,
		validateCommitAjaxParam: validateCommitAjaxParam,

		validateEditStatusString: validateEditStatusString,
		validateEditedData: validateEditedData,
		validateAddDataEvent: validateAddDataEvent,
		validateRemoveDataEvent: validateRemoveDataEvent,
		validateReplaceValueEvent: validateReplaceValueEvent,
		validateChangeDataEvent: validateChangeDataEvent,
		validateChangeTypeString: validateChangeTypeString,
		validateEditEvent: validateEditEvent,
		validateChangeSourceEvent: validateChangeSourceEvent,
		validateChangeSearchStartEvent: validateChangeSearchStartEvent,
		validateChangeSearchSuccessEvent: validateChangeSearchSuccessEvent,
		validateChangeSearchParamErrorEvent: validateChangeSearchParamErrorEvent,
		validateChangeSearchCompleteEvent: validateChangeSearchCompleteEvent,
		validateTreePath: validateTreePath,
		validatePatchPath: validatePatchPath,
		validateAddPatch: validateAddPatch,
		validateRemovePatch: validateRemovePatch,
		validateReplacePatch: validateReplacePatch,
		validateTestPatch: validateTestPatch,
		validatePatch: validatePatch,
		validateLoadedDataReference: validateLoadedDataReference,
		validateNotLoadedDataReference: validateNotLoadedDataReference,
		validateDataReference: validateDataReference,
		validateLocalSearchedData: validateLocalSearchedData,
		validateChangeDataIdStartEvent: validateChangeDataIdStartEvent,
		validateChangeDataIdSuccessEvent: validateChangeDataIdSuccessEvent,
		validateChangeDataIdErrorEvent: validateChangeDataIdErrorEvent,
		validateChangeDataIdCompleteEvent: validateChangeDataIdCompleteEvent,

		validatePixelSize: validatePixelSize,
		validatePixelPosition: validatePixelPosition,
		validateScrollPosition: validateScrollPosition,
		validateDisplayPosition: validateDisplayPosition,
		validateCellPosition: validateCellPosition,
		validateCellRange: validateCellRange,
		validateDataSelectResult: validateDataSelectResult,
		validateChangeCellSelectEvent: validateChangeCellSelectEvent,
		validateSizeKey: validateSizeKey,
		validateDisplayRange: validateDisplayRange,
		validateDirectionString: validateDirectionString,
		validateToValueFunction: validateToValueFunction,
		validateToCopyValuesFunction: validateToCopyValuesFunction,
		validateMapperPropertyDefinition: validateMapperPropertyDefinition,
		validatePropertyDirectionSizeParam: validatePropertyDirectionSizeParam,
		validateDataDirectionSizeParam: validateDataDirectionSizeParam,
		validatePropertyHierarchy: validatePropertyHierarchy,
		validateScrollParam: validateScrollParam,
		validateVisibleProperties: validateVisibleProperties,
		validatePropertyGridDataMapperParam: validatePropertyGridDataMapperParam,
		validateClassName: validateClassName,
		validateGridBorder: validateGridBorder,
		validateGridCell: validateGridCell,
		validateGridRegionName: validateGridRegionName,
		validateGridRequestParam: validateGridRequestParam,
		validatePropertyHeaderBaseCell: validatePropertyHeaderBaseCell,
		validatePropertyHeaderBlankCell: validatePropertyHeaderBlankCell,
		validatePropertyHeaderCell: validatePropertyHeaderCell,
		validateGridChange: validateGridChange,
		validateChangeGridEvent: validateChangeGridEvent,
		validateGridAreaSize: validateGridAreaSize,
		validateCellFormatter: validateCellFormatter,
		validateCellClassDefinition: validateCellClassDefinition,
		validateGridLogicParam: validateGridLogicParam,
		validateTableGridViewControllerParam: validateTableGridViewControllerParam
	};


	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);

})();

/* ----- h5.ui.components.datagrid.error ----- */
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.error';

	/**
	 * @name error
	 * @memberOf h5.ui.components.datagrid
	 * @namespace
	 */
	h5.u.obj.ns(NAMESPACE);

	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var util = h5.ui.components.datagrid.util;


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Functions
	//=============================

	//=============================
	// Variables
	//=============================

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	var errorDefinition = {
		NotFoundIdProperty: 'データが dataId となるプロパティ "{1}" を持っていません; data={0}',
		NotFoundData: 'データが見つかりません; dataId={0}',
		NotFoundProperty: 'プロパティが見つかりません; propertyName={0}',
		IllegalTypeDataId: 'dataId の型が不正です; dataId={0}',
		DuplicateDataId: '同じ dataId のデータが既に存在しています; dataId={0}',
		DuplicateProperty: '同じ名前の property が既に存在しています; propertyName={0}',
		InconsistentUpdate: '更新する値に不整合があります; oldData={0}, propertyName={1}, newValue={2}',
		UpdateRemovedData: '削除されたデータの値を更新しようとしました',
		DuplicateCommit: 'コミット試行中に再度コミットしようとしました',
		NotYetReady: 'まだ準備ができていません',
		AlreadySearch: '検索を実施したあとに実行することはできません',
		IndexOutOfBounds: '範囲外のインデックスにアクセスしようとしました; index={0}',
		IllegalIndex: '不正なインデックスが指定されました; index={0}',
		NotSupported: '{0} 機能は現在の設定ではサポートされていません'
	};

	var exports = util.createErrorDefinitionSet(NAMESPACE, errorDefinition);


	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);

})();

/* ----- h5.ui.components.datagrid.data ----- */
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.data';

	/**
	 * @name data
	 * @memberOf h5.ui.components.datagrid
	 * @namespace
	 */
	h5.u.obj.ns(NAMESPACE);


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var util = h5.ui.components.datagrid.util;
	var type = h5.ui.components.datagrid.type;
	var error = h5.ui.components.datagrid.error;

	var argsToArray = h5.u.obj.argsToArray;
	var format = util.formatVerbose;

	var createArgsValidator = util.validator.createArgumentsValidator;


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Functions
	//=============================

	/**
	 * @private
	 * @param {*} result
	 * @returns {AbortablePromise.<*>}
	 */
	function resolve(result) {
		var deferred = h5.async.deferred();
		deferred.resolve(result);
		return new AbortablePromise(deferred);
	}


	// ---- Search Utility ---- //

	/**
	 * @private
	 * @param {DataSet} dataSet データの集合
	 * @param {PropertyName} parentProperty 親データのdataIdを指すプロパティ名
	 * @returns {Object.<DataId, TreePath>} 各データの {@link TreePath}
	 */
	function calcTreePath(dataSet, parentProperty) {
		/* jshint loopfunc: true */

		var validator = createArgsValidator(NAMESPACE + ':private');

		validator.arg('dataSet', dataSet, type.validateDataSet);
		validator.arg('parentProperty', parentProperty, type.validatePropertyName);

		var pathSet = {};
		var parentSet = util.mapObject(dataSet, function(data, id) {
			return {
				key: id,
				value: data[parentProperty]
			};
		});

		while (!$.isEmptyObject(parentSet)) {
			var founds = [];
			util.forEach(parentSet, function(parentId, id) {
				if (parentId == null) {
					founds.push(id);
					pathSet[id] = [id];
					return;
				}

				if (pathSet[parentId] != null) {
					founds.push(id);
					pathSet[id] = [id].concat(pathSet[parentId]);
				}
			});

			util.forEach(founds, function(found) {
				delete parentSet[found];
			});

			if (founds.length === 0) {
				throw new Error('ツリー構造が正しく構築できませんでした');
			}
		}

		return pathSet;
	}

	/**
	 * @private
	 * @param {Array.<Data>} dataArray
	 * @param {PropertyName} idProperty
	 * @param {LocalSearchParam} searchParam
	 * @returns {Array.<Data>}
	 */
	function searchDataArray(dataArray, idProperty, searchParam) {
		var validator = createArgsValidator(NAMESPACE + ':private');

		validator.arg('dataArray', dataArray, function(v) {
			v.notNull();
			v.array();
			v.values(type.validateData);
		});
		validator.arg('idProperty', idProperty, type.validatePropertyName);
		validator.arg('searchParam', searchParam, type.validateLocalSearchParam);


		var filterFunctions = util.map(searchParam.filter, function(filter) {
			if ($.isFunction(filter)) {
				return function(data) {
					return filter(data);
				};
			}

			var propertyName = filter.property;
			if (filter.predicate != null) {
				return function(data) {
					return filter.predicate(data[propertyName]);
				};
			}

			if (filter.regexp != null) {
				return function(data) {
					return filter.regexp.test(data[propertyName]);
				};
			}

			return function(data) {
				return filter.value === data[propertyName];
			};
		});

		function filter(data) {
			for (var i = 0, len = filterFunctions.length; i < len; i++) {
				var filterFunction = filterFunctions[i];
				if (!filterFunction(data)) {
					return false;
				}
			}

			return true;
		}

		var sortParams = searchParam.sort;

		function compare(a, b) {
			var aData = a.data;
			var bData = b.data;

			for (var i = 0, len = sortParams.length; i < len; i++) {
				var sortParam = sortParams[i];
				var propertyName = sortParam.property;
				var isDesc = sortParam.order === 'desc';

				var aValue = aData[propertyName];
				var bValue = bData[propertyName];

				// MEMO: 文字列と null を比較するとおかしくなるので特別扱いする
				if (aValue == null && bValue != null) {
					return isDesc ? -1 : 1;
				}
				if (aValue != null && bValue == null) {
					return isDesc ? 1 : -1;
				}
				if (aValue == null && bValue == null) {
					continue;
				}

				if (aValue < bValue) {
					return isDesc ? 1 : -1;
				}
				if (bValue < aValue) {
					return isDesc ? -1 : 1;
				}
			}

			// MEMO: 最後は index で並べる
			if (a.index < b.index) {
				return -1;
			}
			return 1;
		}

		var filtered = util.map($.grep(dataArray, filter), function(data) {
			return data;
		});

		if (sortParams == null) {
			return filtered;
		}

		var wraped = util.map(filtered, function(data, index) {
			return {
				index: index,
				data: data
			};
		});

		var sorted = wraped.sort(compare);
		return util.map(sorted, function(wrap) {
			return wrap.data;
		});
	}


	//=============================
	// Variables
	//=============================

	var PromiseInterface = util.defineInterface('Promise', ['done', 'fail', 'always', 'then']);


	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	//=============================
	// AbortablePromise
	//=============================

	/**
	 * 失敗時にコールバック関数に引数として渡されるオブジェクトの型です。
	 *
	 * @typedef {Object} FailResult
	 * @property {boolean} isAborted 中断されたことによる失敗であれば true、そうでなければ false
	 * @property {Array.<*>} args reject されたときに渡された引数
	 */

	var AbortablePromise = util.defineClass(NAMESPACE + '.AbortablePromise', function(ctx) {

		var log = ctx.log;

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor AbortablePromise
		 * @class 中止を指示することが可能な Promise です。失敗時のコールバックでは中断されたことによる失敗かを知るために
		 *        {@link AbortablePromise.FailResult FailResult} 型のオブジェクトが渡されます。
		 * @param {Promise} originalPromise 元のプロミス
		 * @param {function=} [abortFunction] 中断時に呼び出すメソッド（省略した場合は originalPromise.abort() があれば呼び出す）
		 */
		function AbortablePromise(originalPromise, abortFunction) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('originalPromise', originalPromise, function(v) {
				v.notNull();
				v.implement(PromiseInterface);
			});

			validator.arg('abortFunction', abortFunction, function(v) {
				v.nullable();
				v.func();
			});


			this._isAborted = false;
			this._originalPromise = originalPromise;
			this._deferred = h5.async.deferred();

			this._abortFunction = (abortFunction != null) ? abortFunction : this.own(function() {
				if ($.isFunction(this._originalPromise.abort)) {
					log.trace('originalPromise.abort() を呼び出します');
					this._originalPromise.abort();
				} else if ($.isFunction(this._originalPromise.reject)) {
					log.trace('originalPromise.reject() を呼び出します');
					this._originalPromise.reject();
				}
			});

			this._originalPromise.done(this.ownWithOrg(function(context /*, var_args */) {
				var args = argsToArray(arguments);
				var resolveArgs = args.slice(1);

				this._deferred.resolveWith(context, resolveArgs);
			}));

			this._originalPromise.fail(this.ownWithOrg(function(context /*, var_args */) {
				var args = argsToArray(arguments);
				var rejectArgs = args.slice(1);


				var failResult = {
					isAborted: this._isAborted,
					args: rejectArgs
				};

				var arg = rejectArgs[0];


				if (arg != null && typeof arg.isAborted === 'boolean' && $.isArray(arg.args)) {
					failResult = arg;
				}

				this._deferred.rejectWith(context, [failResult]);
			}));
		}

		/** @lends AbortablePromise# */
		var abortablePromiseDefinition = {

			// --- Metadata --- //

			/**
			 * @private
			 * @memberOf _AbortablePromise
			 */
			__name: ctx.className,


			// --- Life Cycle Method --- //

			__dispose: function() {
				if (this.state() === 'pending') {
					this.abort();
				}
			},


			// --- Public Method --- //

			/**
			 * 実行を中断します。
			 * <p>
			 * abortFunction を実行後、状態が pending のままであった場合は reject します。
			 * </p>
			 */
			abort: function() {
				var beforeState = this._deferred.state();
				if (beforeState !== 'pending') {
					log.warn('状態が pending 以外なので abort() は無視されました; state={1}', beforeState);
					return;
				}

				this._isAborted = true;
				this._abortFunction();

				var afterState = this._deferred.state();
				if (afterState === 'pending') {
					log.trace('abortFunction 呼び出し後も状態が pending であったので reject します');
					this._deferred.reject({
						isAborted: true,
						args: []
					});
				}
			},

			/**
			 * Promise の done() と同じです。
			 */
			done: function(/* var_args */) {
				return this._deferred.done.apply(this._deferred, arguments);
			},

			/**
			 * Promise の fail() と同じです。
			 * <p>
			 * 失敗時のコールバック関数に渡される引数は {@link AbortablePromise.FailResult FailResult} 型のオブジェクトとなります。
			 * </p>
			 */
			fail: function(/* var_args */) {
				return this._deferred.fail.apply(this._deferred, arguments);
			},

			/**
			 * Promise の always() と同じです。
			 */
			always: function(/* var_args */) {
				return this._deferred.always.apply(this._deferred, arguments);
			},

			/**
			 * Promise の state() と同じです。
			 */
			state: function(/* var_args */) {
				return this._deferred.state.apply(this._deferred, arguments);
			},

			/**
			 * 基本的に Promise の then() と同じですが {@link AbortablePromise} を返します。
			 * <p>
			 * 失敗時のコールバック関数に渡される引数は {@link AbortablePromise.FailResult FailResult} 型のオブジェクトとなります。
			 * </p>
			 *
			 * @returns {AbortablePromise} 中断可能なプロミスオブジェクト
			 */
			then: function(done, fail) {

				var wrapedDone = null;
				if (done != null) {
					wrapedDone = function(/* var_args */) {
						try {
							return done.apply(this, arguments);
						} catch (e) {
							log.error('convert: Error -> Fail Promise; {0}', e.message);
							if (e.stack != null) {
								log.error(e.stack);
							}

							var deferred = h5.async.deferred();
							deferred.reject(e);
							return deferred.promise();
						}
					};
				}


				var wrapedFail = null;
				if (fail != null) {
					wrapedFail = function(/* var_args */) {
						try {
							return fail.apply(this, arguments);
						} catch (e) {
							log.warn('Overwrite Fail Args: {0}', argsToArray(arguments));
							log.error('convert: Error -> Fail Promise; {0}', e.message);
							if (e.stack != null) {
								log.error(e.stack);
							}

							return e;
						}
					};
				}

				// MEMO: 関数が Promise を返すパターンだと引き継げてないかも
				var thenPromise = this._deferred.then(wrapedDone, wrapedFail);
				return new AbortablePromise(thenPromise, this.own(function() {
					this._isAborted = true;
					this._abortFunction();
				}));
			},

			/**
			 * abort() のできない素のプロミスオブジェクトを返します。
			 *
			 * @returns {Promise} プロミスオブジェクト
			 */
			promise: function() {
				return this._deferred.promise();
			},


			// --- Private Property --- //

			/**
			 * @type {Promise}
			 * @private
			 */
			_originalPromise: null,

			/**
			 * @type {Deferred}
			 * @private
			 */
			_deferred: null,

			/**
			 * @type {function}
			 * @private
			 */
			_abortFunction: null
		};

		return {
			constructorFunction: AbortablePromise,
			mixins: [util.ownSupport, util.disposable],
			definition: abortablePromiseDefinition
		};
	});


	//=============================
	// Edit
	//=============================

	var Edit = util.defineClass(NAMESPACE + '.Edit', function(ctx) {

		// MEMO: JSON Patch の出力はカスタマイズできるようにした方が良いかも（特に test を出すかどうかなど）

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor Edit
		 * @class データの集合に対する編集状態を表現するクラスです。
		 * @mixes EventDispatcher
		 * @mixed Disposable
		 * @param {PropertyName} idProperty dataIdとして用いるプロパティの名前
		 */
		function Edit(idProperty) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('idProperty', idProperty, type.validatePropertyName);

			this._idProperty = idProperty;
			this._addedDataSet = {};
			this._removedDataSet = {};
			this._replacedValueSet = {};
			this._replacedDataSet = {};
			this._countDiff = 0;
		}

		/** @lends Edit# */
		var editDefinition = {

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _Edit
			 */
			__name: ctx.className,


			// --- Public Event --- //
			/**
			 * データが追加されたことを表すイベントです。
			 *
			 * @event Edit#addData
			 * @type {AddDataEvent}
			 */

			/**
			 * データが削除されたこと表すイベントです。
			 *
			 * @event Edit#removeData
			 * @type {RemoveDataEvent}
			 */

			/**
			 * データが置換されたことを表すイベントです。
			 *
			 * @event Edit#replaceValue
			 * @type {ReplaceValueEvent}
			 */

			// --- Public Method --- //
			/**
			 * dataId として用いるプロパティの名前を返します。
			 *
			 * @returns {PropertyName} dataId として用いるプロパティの名前
			 */
			getIdProperty: function() {
				return this._idProperty;
			},

			/**
			 * 編集による変更があるかを返します。
			 *
			 * @returns {boolean} 変更があれば true、そうでなければ false
			 */
			hasChange: function() {
				if (!$.isEmptyObject(this._replacedValueSet)) {
					return true;
				}
				if (!$.isEmptyObject(this._addedDataSet)) {
					return true;
				}
				if (!$.isEmptyObject(this._removedDataSet)) {
					return true;
				}
				return false;
			},

			/**
			 * 編集状態を初期化します。
			 */
			reset: function() {
				this._addedDataSet = {};
				this._removedDataSet = {};
				this._replacedValueSet = {};
				this._replacedDataSet = {};
			},

			/**
			 * 一括編集を開始します。
			 */
			beginMultiEdit: function() {
				this._multiEditStartState = $.extend(true, {}, {
					addedDataSet: this._addedDataSet,
					removedDataSet: this._removedDataSet,
					replacedValueSet: this._replacedValueSet,
					replacedDataSet: this._replacedDataSet
				});
			},

			/**
			 * 一括編集を完了します。
			 */
			endMultiEdit: function() {
				this._multiEditStartState = null;
			},

			/**
			 * 一括編集を取り止め一括編集の開始時点に戻ります。
			 */
			cancelMultiEdit: function() {
				var startState = this._multiEditStartState;
				this._addedDataSet = startState.addedDataSet;
				this._removedDataSet = startState.removedDataSet;
				this._replacedValueSet = startState.replacedValueSet;
				this._replacedDataSet = startState.replacedDataSet;

				this._multiEditStartState = null;
			},

			/**
			 * データを追加します。
			 *
			 * @fires Edit#addData
			 * @param {Data} data 追加するデータ
			 * @throws {NotFoundIdProperty} dataId となるプロパティを data が持っていなかった場合
			 * @throws {IllegalTypeDataId} dataId が不正な型（string以外）であった場合
			 * @throws {DuplicateDataId} dataId が既に登録されているものと重複した場合
			 */
			addData: function(data) {
				var validator = ctx.argsValidator('public');

				validator.arg('data', data, type.validateData);


				var dataId = this._pickId(data);

				if (util.hasProperty(this._addedDataSet, dataId)) {
					throw error.DuplicatedDataId.createError(dataId);
				}
				if (util.hasProperty(this._replacedValueSet, dataId)) {
					throw error.DuplicatedDataId.createError(dataId);
				}

				if (util.hasProperty(this._removedDataSet, dataId)) {
					var originalData = this._removedDataSet[dataId];

					// replacedDataSet の変更
					if (!util.deepEquals(originalData, data)) {
						this._replacedDataSet[dataId] = {
							original: originalData,
							edited: data
						};
					}

					delete this._removedDataSet[dataId];

					var replacedValues = {};

					for ( var key in data) {
						var originalValue = originalData[key];
						if (originalValue == null) {
							originalValue = null;
						}

						// 値の変更がない場合
						if (util.deepEquals(originalValue, data[key])) {
							delete originalData[key];
							continue;
						}

						replacedValues[key] = {
							originalValue: originalValue,
							newValue: data[key]
						};

						delete originalData[key];
					}

					for ( var removeKey in originalData) {
						replacedValues[removeKey] = {
							originalValue: originalData[removeKey],
							newValue: null
						};
					}

					// 変更がなければ記録しない
					if (!$.isEmptyObject(replacedValues)) {
						this._replacedValueSet[dataId] = replacedValues;
					}

				} else {

					this._addedDataSet[dataId] = $.extend(true, {}, data);
				}

				this.dispatchEvent({
					type: 'addData',
					dataId: dataId,
					data: data
				});
			},

			/**
			 * データを削除します。
			 *
			 * @fires Edit#removeData
			 * @param {Data} data 削除するデータ
			 * @throws {NotFoundIdProperty} dataId となるプロパティを data が持っていなかった場合
			 * @throws {IllegalTypeDataId} dataId が不正な型（string以外）であった場合
			 */
			removeData: function(data) {
				var validator = ctx.argsValidator('public');

				validator.arg('data', data, type.validateData);

				var dataId = this._pickId(data);
				var event = {
					type: 'removeData',
					dataId: dataId,
					data: data
				};

				var originalData = $.extend(true, {}, data);

				if (util.hasProperty(this._addedDataSet, dataId)) {
					delete this._addedDataSet[dataId];
					delete this._removedDataSet[dataId];

					this.dispatchEvent(event);
					return;
				}

				if (util.hasProperty(this._replacedValueSet, dataId)) {
					originalData = this.applyData(data).original;
					delete this._replacedValueSet[dataId];
					delete this._replacedDataSet[dataId];
				}

				this._removedDataSet[dataId] = originalData;
				this.dispatchEvent(event);
			},

			/**
			 * データが持つプロパティの値を置き換えます。
			 * <p>
			 * oldValue と newValue には同じ値を指定することはできません。 指定した場合は例外を投げます。
			 * </p>
			 *
			 * @fires Edit#replaceValue
			 * @param {Data} oldData 置き換えるデータ
			 * @param {PropertyName} propertyName プロパティ名
			 * @param {Value} newValue 新しい値
			 * @throws InconsistentUpdate
			 */
			replaceValue: function(oldData, propertyName, newValue) {
				var validator = ctx.argsValidator('public');

				validator.arg('oldData', oldData, type.validateData);
				validator.arg('propertyName', propertyName, type.validatePropertyName);
				validator.arg('newValue', newValue, type.validateValue);

				var dataId = oldData[this._idProperty];
				var oldValue = oldData[propertyName];
				if (typeof oldValue === 'undefined') {
					oldValue = null;
				}

				if (dataId == null) {
					throw new Error('dataId が参照できません');
				}

				if (propertyName === this._idProperty) {
					throw new Error('dataId を置き換えようとしました');
				}

				if (oldValue === newValue) {
					var valueStr = util.toVerboseString(oldValue);
					var msg = format('oldValue と newValue が同じ値（{0}）です', valueStr);
					throw new Error(msg);
				}

				var InconsistentUpdate = error.InconsistentUpdate;

				var newData = $.extend(true, {}, oldData);
				newData[propertyName] = newValue;

				var replacedValues;
				var originalValue = null;

				if (util.hasProperty(this._removedDataSet, dataId)) {

					// 削除された値の更新
					throw error.UpdateRemovedData.createError(dataId);

				} else if (util.hasProperty(this._addedDataSet, dataId)) {

					var addedData = this._addedDataSet[dataId];

					if (oldValue === null && addedData[propertyName] != null) {
						throw InconsistentUpdate.createError(oldData, propertyName, newValue);
					}

					// oldValue が null のときはチェックしない
					if (oldValue !== null && !util.deepEquals(oldValue, addedData[propertyName])) {
						throw InconsistentUpdate.createError(oldData, propertyName, newValue);
					}

					addedData[propertyName] = newValue;

				} else if (util.hasProperty(this._replacedValueSet, dataId)) {

					// replacedDataSet の更新
					this._replacedDataSet[dataId].edited = newData;

					// replacedValueSet の更新
					replacedValues = this._replacedValueSet[dataId];

					if (!util.hasProperty(replacedValues, propertyName)) {

						// 新しいプロパティだったら新規に作成する
						replacedValues[propertyName] = {
							originalValue: oldValue,
							newValue: newValue
						};

						originalValue = oldValue;

					} else {

						var replaceValueInfo = replacedValues[propertyName];

						// oldValue が記録と異なっていたら例外を投げる
						if (!util.deepEquals(oldValue, replaceValueInfo.newValue)) {
							throw InconsistentUpdate.createError(oldData, propertyName, newValue);
						}

						// 変更がなければ何もせず抜ける
						if (util.deepEquals(replaceValueInfo.newValue, newValue)) {
							return;
						}

						if (util.deepEquals(replaceValueInfo.originalValue, newValue)) {

							// original と同じ値に戻るのであれば変更をなかったことにする
							delete replacedValues[propertyName];

						} else {

							// 値を変更する
							replaceValueInfo.newValue = newValue;
						}

						originalValue = replaceValueInfo.originalValue;
					}

					// 変更のあるプロパティがすべてなくなったらデータの変更自体を削除
					if ($.isEmptyObject(replacedValues)) {
						delete this._replacedValueSet[dataId];
						delete this._replacedDataSet[dataId];
					}

				} else {

					this._replacedDataSet[dataId] = {
						original: oldData,
						edited: newData
					};

					replacedValues = {};
					replacedValues[propertyName] = {
						originalValue: oldValue,
						newValue: newValue
					};
					this._replacedValueSet[dataId] = replacedValues;

					originalValue = oldValue;
				}

				this.dispatchEvent({
					type: 'replaceValue',
					dataId: dataId,
					propertyName: propertyName,
					originalValue: originalValue,
					oldValue: oldValue,
					newValue: newValue
				});
			},

			/**
			 * 編集によって追加されたデータの一覧を返します。
			 *
			 * @returns {DataSet} 追加されたデータ一覧（IDがキーでデータ自体が値となったオブジェクト）
			 */
			getAddedDataSet: function() {
				return $.extend(true, {}, this._addedDataSet);
			},

			/**
			 * 編集によって削除されたデータの一覧を返します。
			 *
			 * @returns {DataSet} 削除されたデータ一覧（IDがキーでデータ自体が値となったオブジェクト）
			 */
			getRemovedDataSet: function() {
				return $.extend(true, {}, this._removedDataSet);
			},

			/**
			 * 編集によって値が書き換えられたデータの一覧を返します。
			 *
			 * @returns {Object.<DataId, {original: Data, edited: Data}>} 値が書き換えられたデータの一覧
			 */
			getReplacedDataSet: function() {
				return $.extend(true, {}, this._replacedDataSet);
			},

			/**
			 * データに編集を適用します。
			 *
			 * @param {Data} data 編集を適用するデータ
			 * @returns {EditedData} 編集を適用した結果
			 * @throws {NotFoundIdProperty} dataId となるプロパティを data が持っていなかった場合
			 * @throws {IllegalTypeDataId} dataId が不正な型（string以外）であった場合
			 */
			applyData: function(data) {
				var validator = ctx.argsValidator('public');

				validator.arg('data', data, type.validateData);


				var dataId = this._pickId(data);

				if (util.hasProperty(this._removedDataSet, dataId)) {
					return {
						dataId: dataId,
						editStatus: 'removed',
						original: data,
						edited: null
					};
				}

				if (!util.hasProperty(this._replacedValueSet, dataId)) {
					return {
						dataId: dataId,
						editStatus: 'unchanged',
						original: data,
						edited: data
					};
				}

				var replacedValues = this._replacedValueSet[dataId];
				var originalValues = {};
				var newValues = {};

				for ( var key in replacedValues) {
					var info = replacedValues[key];
					originalValues[key] = info.originalValue;
					newValues[key] = info.newValue;
				}

				var original = $.extend(true, {}, data, originalValues);
				var edited = $.extend(true, {}, data, newValues);

				return {
					dataId: dataId,
					editStatus: 'updated',
					original: original,
					edited: edited
				};
			},

			/**
			 * 編集状態を JSON Patch 形式に変換して返します。
			 *
			 * @returns {Array.<Patch>} JSON Patch 形式のオブジェクト
			 */
			calcPatch: function() {

				var patch = [];

				$.each(this._removedDataSet, function(dataId, data) {

					patch.push({
						op: 'test',
						path: '/' + dataId,
						value: data
					});

					patch.push({
						op: 'remove',
						path: '/' + dataId
					});
				});

				$.each(this._addedDataSet, function(dataId, data) {
					patch.push({
						op: 'add',
						path: '/' + dataId,
						value: data
					});
				});

				$.each(this._replacedValueSet, function(dataId, replacedValues) {
					$.each(replacedValues, function(propertyName, replaceInfo) {
						var path = '/' + dataId + '/' + propertyName;

						patch.push({
							op: 'test',
							path: path,
							value: replaceInfo.originalValue
						});

						patch.push({
							op: 'replace',
							path: path,
							value: replaceInfo.newValue
						});
					});
				});

				return patch;
			},


			// --- Private Property --- //

			/**
			 * @type {PropertyName}
			 * @private
			 */
			_idProperty: null,

			/**
			 * @type {DataSet}
			 * @private
			 */
			_addedDataSet: null,

			/**
			 * @type {DataSet}
			 * @private
			 */
			_removedDataSet: null,

			/**
			 * @type {Object.<DataId, Object.<string, {originalValue: Value, newValue: Value}>>}
			 * @private
			 */
			_replacedValueSet: null,

			/**
			 * @type {Object.<DataId, {original: Data, edited: Data}>}
			 * @private
			 */
			_replacedDataSet: null,

			/**
			 * @type {Object}
			 * @private
			 */
			_multiEditStartState: null,


			// --- Private Method --- //

			/**
			 * データから ID を取り出します。
			 *
			 * @private
			 * @param {Data} data データ
			 * @throws {NotFoundIdProperty} dataId となるプロパティを data が持っていなかった場合
			 * @throws {IllegalTypeDataId} dataId が不正な型（string以外）であった場合
			 * @returns {DataId} データのID
			 */
			_pickId: function(data) {
				var validator = ctx.argsValidator('private');
				validator.arg('data', data, type.validateData);

				var dataId = data[this._idProperty];

				if (dataId == null) {
					var dataStr = util.toVerboseString(data);
					throw error.NotFoundIdProperty.createError(dataStr, this._idProperty);
				}

				if (typeof dataId !== 'string') {
					throw error.IllegalTypeDataId.createError(dataId);
				}

				return dataId;
			}

		};

		return {
			constructorFunction: Edit,
			mixins: [h5.mixin.eventDispatcher, util.disposable],
			definition: editDefinition
		};
	});


	//=============================
	// EditCommand
	//=============================

	var EditCommand = util.defineAbstractClass(NAMESPACE + '.EditCommand', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor EditCommand
		 * @abstract
		 * @class ひとつの編集コマンドを表現するクラスです。
		 */
		function EditCommand() {}

		var abstractMethods = [
		/**
		 * コマンドを適用します。
		 *
		 * @method
		 * @public
		 * @memberOf EditCommand#
		 * @name apply
		 * @param {Edit} edit 適用する編集状態
		 */
		'apply',

		/**
		 * コマンドの適用による変更を戻します。
		 *
		 * @method
		 * @public
		 * @memberOf EditCommand#
		 * @name revert
		 * @param {Edit} edit 変更を編集状態
		 */
		'revert'];

		var editCommandDefinition = {

			// --- Metadata --- //

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _EditCommand
			 */
			__name: ctx.className

		};

		return {
			constructorFunction: EditCommand,
			definition: editCommandDefinition,
			abstractMethods: abstractMethods
		};

	});


	var AddDataCommand = util.defineClass(NAMESPACE + '.AddDataCommand', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor AddDataCommand
		 * @class データを追加する編集コマンドです。
		 * @extends EditCommand
		 * @param {Data} data 追加するデータ
		 */
		function AddDataCommand(data) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('data', data, type.validateData);

			this._data = data;
		}

		/** @lends AddDataCommand */
		var addDataCommandDefinition = {

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _AddDataCommand
			 */
			__name: ctx.className,

			apply: function(edit) {
				edit.addData(this._data);
			},

			revert: function(edit) {
				edit.removeData(this._data);
			}
		};

		return {
			constructorFunction: AddDataCommand,
			superConstructorFunction: EditCommand,
			definition: addDataCommandDefinition
		};
	});

	var RemoveDataCommand = util.defineClass(NAMESPACE + '.RemoveDataCommand', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor RemoveDataCommand
		 * @class データを削除する編集コマンドです。
		 * @extends EditCommand
		 * @param {Data} data 削除するデータ
		 */
		function RemoveDataCommand(data) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('data', data, type.validateData);

			this._data = data;
		}

		/** @lends RemoveDataCommand# */
		var removeDataCommandDefinition = {

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _RemoveDataCommand
			 */
			__name: ctx.className,

			apply: function(edit) {
				edit.removeData(this._data);
			},

			revert: function(edit) {
				edit.addData(this._data);
			}
		};

		return {
			constructorFunction: RemoveDataCommand,
			superConstructorFunction: EditCommand,
			definition: removeDataCommandDefinition
		};
	});

	var ReplaceValueCommand = util.defineClass(NAMESPACE + '.ReplaceValueCommand', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor ReplaceValueCommand
		 * @class データの値を置き換える編集コマンドです。
		 * @extends EditCommand
		 * @param {Data} oldData 置き換えるデータ
		 * @param {PropertyName} propertyName 置き換えるプロパティ名
		 * @param {Value} newValue 新しい値
		 */
		function ReplaceValueCommand(oldData, propertyName, newValue) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('oldData', oldData, type.validateData);
			validator.arg('propertyName', propertyName, type.validatePropertyName);
			validator.arg('newValue', newValue, type.validateValue);

			this._oldData = oldData;
			this._propertyName = propertyName;
			this._newValue = newValue;
		}

		/** @lends ReplaceValueCommand# */
		var replaceValueCommandDefinition = {

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _RemoveDataCommand
			 */
			__name: ctx.className,

			apply: function(edit) {
				var oldData = this._oldData;
				var propertyName = this._propertyName;
				var newValue = this._newValue;

				edit.replaceValue(oldData, propertyName, newValue);
			},

			revert: function(edit) {
				var oldData = this._oldData;
				var propertyName = this._propertyName;
				var newValue = this._newValue;

				var oldValue = oldData[propertyName];
				if (typeof oldValue === 'undefined') {
					oldValue = null;
				}
				var newData = $.extend(true, {}, oldData);
				newData[propertyName] = newValue;

				edit.replaceValue(newData, propertyName, oldValue);
			},

			_oldData: null,
			_propertyName: null,
			_newValue: null
		};

		return {
			constructorFunction: ReplaceValueCommand,
			superConstructorFunction: EditCommand,
			definition: replaceValueCommandDefinition
		};
	});

	var BatchCommand = util.defineClass(NAMESPACE + '.BatchCommand', function(ctx) {

		var log = ctx.log;

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor BatchCommand
		 * @class 複数の編集コマンドをまとめて実行する編集コマンドです。
		 * @extends EditCommand
		 * @param {Array.<EditCommand>} commands
		 */
		function BatchCommand(commands) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('commands', commands, function(v) {
				v.notNull();
				v.array();

				v.values(function(v) {
					v.notNull();
					v.instanceOf(EditCommand);
				});
			});

			this._commands = commands;
		}

		/** @lends BatchCommand# */
		var batchCommandDefinition = {

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _RemoveDataCommand
			 */
			__name: ctx.className,

			apply: function(edit) {
				var commands = this._commands;

				edit.beginMultiEdit();

				try {
					for (var i = 0, len = commands.length; i < len; i++) {
						var command = commands[i];
						command.apply(edit);
					}
					edit.endMultiEdit();
				} catch (e) {
					log.error(e);
					edit.cancelMultiEdit();
					throw e;
				}
			},

			revert: function(edit) {
				var commands = this._commands;
				for (var i = commands.length - 1; 0 <= i; i--) {
					var command = commands[i];
					command.revert(edit);
				}
			}
		};

		return {
			constructorFunction: BatchCommand,
			superConstructorFunction: EditCommand,
			definition: batchCommandDefinition
		};
	});


	//=============================
	// EditCommandBuilder
	//=============================

	var EditCommandBuilder = util.defineClass(NAMESPACE + '.EditCommandBuilder', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor EditCommandBuilder
		 * @class 編集コマンド作成するためのクラスです。
		 */
		function EditCommandBuilder() {
			this._commands = [];
		}

		/** @lends EditCommandBuilder# */
		var editCommandBuilderDefinition = {

			// --- Metadata --- //

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _EditCommandBuilder
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * データを追加する操作を追加します。
			 *
			 * @param {Data} data 追加するデータ
			 * @returns {EditCommandBuilder} このオブジェクト自体
			 */
			addData: function(data) {
				var command = new AddDataCommand(data);
				this._commands.push(command);
				return this;
			},

			/**
			 * データを削除する操作を追加します。
			 *
			 * @param {Data} data 削除するデータ
			 * @returns {EditCommandBuilder} このオブジェクト自体
			 */
			removeData: function(data) {
				var command = new RemoveDataCommand(data);
				this._commands.push(command);
				return this;
			},

			/**
			 * 値を置き換える操作を追加します。
			 *
			 * @param {Data} oldData 置き換えるでーたq
			 * @param {PropertyName} propertyName プロパティ名
			 * @param {Value} newValue 新しい値
			 * @returns {EditCommandBuilder} このオブジェクト自体
			 */
			replaceValue: function(oldData, propertyName, newValue) {
				// TODO: replaceValue をまとめたときの oldData の扱いをまともにする

				var command = new ReplaceValueCommand(oldData, propertyName, newValue);
				this._commands.push(command);
				return this;
			},

			/**
			 * これまで登録した操作を実行する編集コマンドを返します。
			 *
			 * @returns {EditCommand} 編集コマンド
			 */
			toCommand: function() {
				if (this._commands.length === 1) {
					return this._commands[0];
				}

				// MEMO: 登録がなかった場合はエラーにすべきかも
				return new BatchCommand(this._commands);
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {Array.<EditCommand>}
			 */
			_commands: null
		};

		return {
			constructorFunction: EditCommandBuilder,
			definition: editCommandBuilderDefinition
		};
	});


	//=============================
	// DataAccessor
	//=============================

	var DataAccessor = util.defineAbstractClass(NAMESPACE + '.DataAccessor', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor DataAccessor
		 * @abstract
		 * @class データへのアクセス方法を定めるクラスです。
		 * @mixes EventDispatcher
		 * @mixes Dispoable
		 * @mixes OwnSupport
		 */
		function DataAccessor() {}

		var abstractMethods = [

		/**
		 * 検索を行います。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataAccessor#
		 * @name search
		 * @param {SearchParam} searchParam 検索パラメータ
		 * @returns {AbortablePromise.<SearchResult>} 検索結果を返す Promise オブジェクト
		 */
		'search',

		/**
		 * 検索の結果に対して取得する範囲を指定してデータのフェッチを行います。
		 * <p>
		 * fetchParam は検索の結果によって得ることができます。
		 * </p>
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataAccessor#
		 * @name fetch
		 * @param {FetchParam} fetchParam フェッチパラメータ
		 * @param {FetchRange} fetchRange フェッチ範囲
		 * @returns {AbortablePromise.<FetchResult>} フェッチ結果を返す Promise オブジェクト
		 */
		'fetch',

		/**
		 * IDを指定してデータを取得します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataAccessor#
		 * @name find
		 * @param {DataId} dataId データのID
		 * @returns {AbortablePromise.<Data>} 指定したIDのデータを返す Promise オブジェクト
		 */
		'find',

		/**
		 * 編集結果をコミットします。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataAccessor#
		 * @name commit
		 * @param {Edit} edit 編集状態
		 * @returns {Promise} コミットの完了を待機する Promise オブジェクト
		 */
		'commit'];

		var dataAccessorDefinition = {

			// --- Metadata --- //

			/**
			 * このコメントは eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _DataAcceccor
			 */
			__name: ctx.className,


			// --- Public Event --- //

			/**
			 * 元データが変化したことを表すイベントです。
			 *
			 * @event DataAccessor#changeSource
			 * @type {ChangeSourceEvent}
			 */

			// --- Protected Method --- //
			/**
			 * {@link DataSource#changeSource changeSource} イベントを発火させます。
			 * <p>
			 * サブクラスから呼び出してもらうことを想定したメソッドです。
			 * </p>
			 *
			 * @protected
			 * @param {Array.<ChangeDataEvent>} changes
			 */
			dispatchChangeSource: function(changes) {
				var validator = ctx.argsValidator('public');

				validator.arg('changes', changes, function(v) {
					v.notNull();
					v.array();

					v.values(type.validateChangeDataEvent);
				});

				this.dispatchEvent({
					type: 'changeSource',
					changes: changes
				});
			}
		};


		return {
			constructorFunction: DataAccessor,
			abstractMethods: abstractMethods,
			mixins: [h5.mixin.eventDispatcher, util.disposable, util.ownSupport],
			definition: dataAccessorDefinition
		};
	});


	// ---- ArrayDataAccessor ---- //

	var LocalDataAccessor = util.defineClass(NAMESPACE + '.LocalDataAccessor', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor ArrayDataAccessor
		 * @class 元データとして配列を利用する DataAccessor です。
		 * @extends DataAccessor
		 * @param {PropertyName} idProperty dataId として用いるプロパティの名前
		 * @param {Array.<Data>} sourceDataArray 元データとなる配列
		 */
		function LocalDataAccessor(idProperty, sourceDataArray) {
			var validator = ctx.argsValidator('user');

			validator.arg('idPropery', idProperty, type.validatePropertyName);

			validator.arg('sourceDataArray', sourceDataArray, function(v) {
				v.notNull();
				v.array();
			});

			this._idProperty = idProperty;
			this._sourceDataArray = sourceDataArray;
		}

		/** @lends LocalDataAccessor# */
		var localDataAccessorDefinition = {

			// --- Metadata --- //

			/**
			 * このコメントは eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _LocalDataAccessor
			 */
			__name: ctx.className,


			// --- Implement Method --- //

			search: function(searchParam) {
				var validator = ctx.argsValidator('public');

				validator.arg('searchParam', searchParam, type.validateLocalSearchParam);

				var dataArray = this._sourceDataArray;
				var searched = searchDataArray(dataArray, this._idProperty, searchParam);

				var result = {
					searchParam: searchParam,
					fetchParam: searchParam,
					fetchLimit: searched.length,
					initialData: {
						fetchRange: {
							index: 0,
							length: searched.length
						},
						isAllData: true,
						dataArray: searched
					}
				};

				return resolve(result);
			},

			fetch: function(fetchParam, fetchRange) {
				var validator = ctx.argsValidator('public');

				validator.arg('fetchParam', fetchParam, type.validateLocalSearchParam);
				validator.arg('fetchRange', fetchRange, type.validateFetchRange1D);

				var start = fetchRange.index;
				var end = start + fetchRange.length;

				var dataArray = this._sourceDataArray;
				var searched = searchDataArray(dataArray, this._idProperty, fetchParam);

				var result = {
					fetchParam: fetchParam,
					fetchRange: fetchRange,
					dataArray: searched.slice(start, end)
				};

				return resolve(result);
			},

			find: function(dataId) {
				var validator = ctx.argsValidator('public');

				validator.arg('dataId', dataId, type.validateDataId);

				var result = null;

				util.forEach(this._sourceDataArray, this.own(function(data) {
					if (dataId === data[this._idProperty]) {
						result = data;
						return false;
					}
				}));

				return resolve(result);
			},

			commit: function(edit) {
				var validator = ctx.argsValidator('public');

				validator.arg('edit', edit, function(v) {
					v.notNull();
					v.instanceOf(Edit);
				});

				var addedSet = edit.getAddedDataSet();
				var removedSet = edit.getRemovedDataSet();

				var newArray = [];

				util.forEach(this._sourceDataArray, this.own(function(data) {
					var dataId = data[this._idProperty];

					// remove
					if (util.hasProperty(removedSet, dataId)) {
						return;
					}

					// update
					newArray.push(edit.applyData(data).edited);
				}));

				util.forEach(addedSet, function(data) {
					// add
					newArray.push(data);
				});

				this._sourceDataArray = newArray;

				return resolve().promise();
			},


			// --- Public Method --- //

			getSourceDataSet: function() {
				return util.mapObject(this._sourceDataArray, function(data) {
					var dataId = data[this._idProperty];
					return {
						key: dataId,
						value: data
					};
				});
			},

			getSourceDataArray: function() {
				return $.extend(true, [], this._sourceDataArray);
			},

			setSourceDataSet: function(sourceDataArray) {
				this._sourceDataSet = util.mapObject(sourceDataArray, this.own(function(data) {
					return {
						key: data[this._idProperty],
						value: data
					};
				}));
			},

			// --- Private Property --- //

			/**
			 * @private
			 * @type {PropertyName}
			 */
			_idProperty: null,

			/**
			 * @private
			 * @type {Array.<Data>}
			 */
			_sourceDataArray: null
		};

		return {
			constructorFunction: LocalDataAccessor,
			superConstructorFunction: DataAccessor,
			definition: localDataAccessorDefinition
		};
	});


	// ---- AjaxDataAccessor ---- //

	/**
	 * h5.ajax メソッド に渡すパラメータの型です。
	 *
	 * @typedef {Object} AjaxSetting
	 * @memberOf AjaxDataAccessor
	 */

	var AjaxDataAccessor = util.defineClass(NAMESPACE + '.AjaxDataAccessor', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor AjaxDataAccessor
		 * @class 元データとしてAJAXでサーバにアクセスする DataAccessor です。
		 * @extends DataAccessor
		 * @param {Object} param AJAXでアクセスする際の設定
		 * @param {Function=} [param.ajax] 利用する AJAX関数（デフォルトは h5.ajax）
		 * @param {SearchAjaxParam} param.search 検索のクエリを投げる際のAJAXの設定
		 * @param {FetchAjaxParam} param.fetch フェッチのクエリを投げる際のAJAXの設定
		 * @param {FindAjaxParam} param.find データ取得のクエリを投げる際のAJAX設定
		 * @param {CommitAjaxParam=} [param.commit] コミットのクエリを投げる際のAJAX設定
		 */
		function AjaxDataAccessor(param) {
			var validator = ctx.argsValidator('user');

			validator.arg('param', param, function(v) {
				v.notNull();
				v.plainObject();

				v.property('ajax', function(v) {
					v.nullable();
					v.func();
				});
				v.property('search', type.validateSearchAjaxParam);
				v.property('fetch', type.validateFetchAjaxParam);
				v.property('find', type.validateFindAjaxParam);
				v.property('commit', function(v) {
					v.nullable();
					type.validateCommitAjaxParam(v);
				});
			});

			if (param.ajax != null) {
				this._ajax = param.ajax;
			}

			this._makeSearchSetting = param.search.request;
			this._parseSearchResult = param.search.response;

			this._makeFetchSetting = param.fetch.request;
			this._parseFetchResult = param.fetch.response;

			this._makeFindSetting = param.find.request;
			this._parseFindResult = param.find.response;

			if (param.commit != null) {
				this._makeCommitSetting = param.commit.request;
				this._parseCommitResult = param.commit.response;
			}
		}

		/** @lends AjaxDataAccessor# */
		var ajaxDataAccessorDefinition = {

			// --- Metadata --- //

			/**
			 * このコメントは eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _AjaxDataAccessor
			 */
			__name: ctx.className,


			// --- Implement Method --- //

			search: function(searchParam) {
				var validator = ctx.argsValidator('public');
				var returnValidator = ctx.validator('user');

				validator.arg('searchParam', searchParam, type.validateSearchParam);

				var setting = this._makeSearchSetting(searchParam);
				returnValidator.run('searchSettingMaker の戻り値', 'result', setting,
						type.validateAjaxSetting);

				var jqXhr = this._ajax(setting);
				var promise = new AbortablePromise(jqXhr);

				return promise.then(this.own(function(/* var_args */) {
					var result = this._parseSearchResult.apply(null, arguments);
					result.searchParam = searchParam;
					returnValidator.run('searchResultParser の戻り値', 'result', result,
							type.validateSearchResult);
					return result;
				}));
			},

			fetch: function(fetchParam, fetchRange) {
				var validator = ctx.argsValidator('public');
				var returnValidator = ctx.validator('user');

				validator.arg('fetchParam', fetchParam, type.validateFetchParam);
				validator.arg('fetchRange', fetchRange, type.validateFetchRange1D);

				var setting = this._makeFetchSetting(fetchParam, fetchRange);
				returnValidator.run('fetchSettingMaker の戻り値', 'result', setting,
						type.validateAjaxSetting);

				var jqXhr = this._ajax(setting);
				var promise = new AbortablePromise(jqXhr);

				return promise.then(this.own(function(/* var_args */) {
					var result = this._parseFetchResult.apply(null, arguments);
					result.fetchParam = fetchParam;
					result.fetchRange = fetchRange;
					returnValidator.run('fetchResultParser の戻り値', 'result', result,
							type.validateFetchResult);
					return result;
				}));
			},

			find: function(dataId) {
				var validator = ctx.argsValidator('public');
				var returnValidator = ctx.validator('user');

				validator.arg('dataId', dataId, type.validateDataId);

				var setting = this._makeFindSetting(dataId);
				returnValidator.run('findSettingMaker の戻り値', 'result', setting,
						type.validateAjaxSetting);

				var jqXhr = this._ajax(setting);
				var promise = new AbortablePromise(jqXhr);

				return promise.then(this.own(function(/* var_args */) {
					var result = this._parseFindResult.apply(null, arguments);
					returnValidator.run('findResultParser の戻り値', 'result', result,
							type.validateData);
					return result;
				}));
			},

			commit: function(edit) {
				var validator = ctx.argsValidator('public');
				var returnValidator = ctx.validator('user');

				validator.arg('edit', edit, function(v) {
					v.notNull();
					v.instanceOf(Edit);
				});

				var setting = this._makeCommitSetting(edit);
				returnValidator.run('commitSettingMaker の戻り値', 'result', setting,
						type.validateAjaxSetting);

				var jqXhr = this._ajax(setting);

				return jqXhr.then(this.own(function(/* var_args */) {
					var result = this._parseCommitResult.apply(null, arguments);
					return result;
				}));
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {Function}
			 */
			_ajax: h5.ajax,

			/**
			 * @private
			 * @type {SearchAjaxSettingMaker}
			 */
			_makeSearchSetting: null,

			/**
			 * @private
			 * @type {SearchAjaxResultParser}
			 */
			_parseSearchResult: null,

			/**
			 * @private
			 * @type {FetchAjaxSettingMaker}
			 */
			_makeFetchSetting: null,

			/**
			 * @private
			 * @type {FetchAjaxResultParser}
			 */
			_parseFetchResult: null,

			/**
			 * @private
			 * @type {FindAjaxSettingMaker}
			 */
			_makeFindSetting: null,

			/**
			 * @private
			 * @type {FindAjaxResultParser}
			 */
			_parseFindResult: null,

			/**
			 * @private
			 * @type {CommitAjaxSettingMaker}
			 */
			_makeCommitSetting: function() {
				throw error.NotSupported.createError('Commit');
			},

			/**
			 * @private
			 * @type {CommitAjaxResultParser}
			 */
			_parseCommitResult: function() {
				throw error.NotSupported.createError('Commit');
			}
		};

		return {
			constructorFunction: AjaxDataAccessor,
			superConstructorFunction: DataAccessor,
			definition: ajaxDataAccessorDefinition
		};
	});


	// MEMO: hifive 1.2 が出たら DataModelAccessor を作る


	//=============================
	// DataSource
	//=============================

	var DataSource = util.defineClass(NAMESPACE + '.DataSource', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor DataSource
		 * @class 元データを管理するクラスです。データへのアクセスと編集状態の管理について責任を持ちます。
		 * @mixes EventDispatcher
		 * @mixes Disposable
		 * @mixes OwnSupport
		 * @param {PropertyName} idProperty dataId として用いるプロパティの名前
		 * @param {DataAccessor} dataAccessor データへのアクセス方法を定義したオブジェクト
		 */
		function DataSource(idProperty, dataAccessor) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('idProperty', idProperty, type.validatePropertyName);
			validator.arg('dataAccessor', dataAccessor, function(v) {
				v.notNull();
				v.instanceOf(DataAccessor);
			});

			this._edit = new Edit(idProperty);
			this._dataAccessor = dataAccessor;

			this._isCommitting = false;
			this._editHistory = [];
			this._undoHistory = [];
			this._changes = [];
			this._listenerSet = util.createEventListenerSet(this);

			this._listenerSet.registerEventListeners(eventListeners);

			this.disableChainDispose();
		}


		function pushChanges(event) {
			/* jshint validthis: true */
			this._changes.push(event);
		}

		var eventListeners = {
			_edit: {
				addData: pushChanges,
				removeData: pushChanges,
				replaceValue: pushChanges
			},

			_dataAccessor: {
				changeSource: 'propagate'
			}
		};


		/** @lends DataSource# */
		var dataSourceDefinition = {

			// --- Metadata --- //

			/**
			 * このコメントは eclipse のアウトライン用です。
			 *
			 * @memberOf _DataSource
			 * @private
			 */
			__name: ctx.className,


			// --- Public Event --- //

			// -- Edit Event -- //

			/**
			 * 編集によってデータが変更されたことを表すイベントです。
			 *
			 * @event DataSource#edit
			 * @type {EditEvent}
			 */

			/**
			 * 元データが変化したことを表すイベントです。
			 *
			 * @event DataSource#changeSource
			 * @type {ChangeSourceEvent}
			 */


			// -- Sync Event -- //
			/**
			 * コミットが開始されたことを表すイベントです。
			 *
			 * @event DataSource#commitStart
			 * @type {CommitStartEvent}
			 */

			/**
			 * コミットが成功したことを表すイベントです。
			 *
			 * @event DataSource#commitSuccess
			 * @type {CommitSuccessEvent}
			 */

			/**
			 * コミットが失敗したことを表すイベントです。
			 *
			 * @event DataSource#commitError
			 * @type {CommitErrorEvent}
			 */

			/**
			 * コミットが完了したことを表すイベントです。
			 * <p>
			 * このイベントはコミットの成否に関わらず呼び出されます。
			 * </p>
			 *
			 * @event DataSource#commitComplete
			 * @type {CommitCompleteEvent}
			 */

			// MEMO: コミットの中止について考える
			/**
			 * ロールバックされたことを表すイベント。
			 *
			 * @event DataSource#rollback
			 * @type {RollbackEvent}
			 */


			// --- Public Method --- //
			/**
			 * IDとなるプロパティ名を返します。
			 *
			 * @returns {PropertyName} IDとなるプロパティ名
			 */
			getIdProperty: function() {
				return this._edit.getIdProperty();
			},

			getDataAccessor: function() {
				return this._dataAccessor;
			},

			// -- データを参照するメソッド -- //
			/**
			 * データを検索します。
			 *
			 * @param {SearchParam} searchParam 検索パラメータ
			 * @returns {AbortablePromise.<EditedSearchResult>} 検索結果を返す Promise オブジェクト
			 */
			searchData: function(searchParam) {
				var validator = ctx.argsValidator('public');

				validator.arg('searchParam', searchParam, type.validateSearchParam);

				var promise = this._dataAccessor.search(searchParam);

				var searchPromise = promise.then(this.own(function(searchResult) {
					if (searchResult.initialData == null) {
						return searchResult;
					}

					var initialData = searchResult.initialData;
					var dataArray = initialData.dataArray;
					initialData.dataArray = util.map(dataArray, this.own(function(data) {
						return this._edit.applyData(data);
					}));

					return searchResult;
				}));

				this._searchPromise = searchPromise;
				return searchPromise;
			},

			/**
			 * 検索したデータをフェッチします。
			 *
			 * @param {FetchParam} fetchParam フェッチパラメータ
			 * @param {FetchRange} fetchRange フェッチで取得する範囲
			 * @returns {AbortablePromise.<EditedFetchResult>} フェッチ結果を返す Promise オブジェクト
			 */
			fetchData: function(fetchParam, fetchRange) {
				var validator = ctx.argsValidator('public');

				validator.arg('fetchParam', fetchParam, type.validateFetchParam);
				validator.arg('fetchRange', fetchRange, type.validateFetchRange);

				var promise = this._dataAccessor.fetch(fetchParam, fetchRange);

				var fetchPromise = promise.then(this.own(function(fetchResult) {
					var dataArray = fetchResult.dataArray;
					fetchResult.dataArray = util.map(dataArray, this.own(function(data) {
						return this._edit.applyData(data);
					}));

					return fetchResult;
				}));

				this._fetchPromise = fetchPromise;
				return fetchPromise;
			},

			/**
			 * IDを指定してデータを取得します。
			 *
			 * @param {DataId} dataId データのID
			 * @returns {AbortablePromise.<EditedData>} データを返す Promise オブジェクト
			 */
			findData: function(dataId) {
				var validator = ctx.argsValidator('public');

				validator.arg('dataId', dataId, type.validateDataId);

				var promise = this._dataAccessor.find(dataId);
				var findPromise = promise.then(this.own(function(data) {
					return this._edit.applyData(data);
				}));

				this._findPromise = findPromise;
				return findPromise;
			},

			/**
			 * コミット前の変更で追加されたデータの一覧を返します。
			 *
			 * @returns {DataSet} 追加されたデータ一覧（IDがキーでデータ自体が値となったオブジェクト）
			 */
			getAddedDataSet: function() {
				return this._edit.getAddedDataSet();
			},

			/**
			 * コミット前の変更で削除されたデータの一覧を返します。
			 *
			 * @returns {DataSet} 削除されたデータ一覧（IDがキーでデータ自体が値となったオブジェクト）
			 */
			getRemovedDataSet: function() {
				return this._edit.getRemovedDataSet();
			},

			/**
			 * コミット前の変更で値が書き換えられたデータの一覧を返します。
			 *
			 * @returns {Object.<DataId, {original: Data, edited: Data}>} 値が書き換えられたデータの一覧
			 */
			getReplacedDataSet: function() {
				return this._edit.getReplacedDataSet();
			},

			/**
			 * データに編集を適用して返します。
			 *
			 * @param {Data} data 編集を適用するデータ
			 * @returns {EditedData} 編集の結果
			 */
			applyEdit: function(data) {
				var validator = ctx.argsValidator('public');
				validator.arg('data', data, type.validateData);

				return this._edit.applyData(data);
			},


			// -- 状態を確認するメソッド -- //

			/**
			 * コミット前の変更があるかを返す。
			 *
			 * @returns {boolean} コミット前の変更があれば true、そうでなければ false
			 */
			hasChange: function() {
				return this._edit.hasChange();
			},

			/**
			 * コミット前の変更を JSON Patch 形式に変換して返します。
			 *
			 * @returns {Array.<Patch>} JSON Patch 形式のオブジェクト
			 */
			calcPatch: function() {
				return this._edit.calcPatch();
			},

			/**
			 * コミットをしている途中であるかを返す。
			 *
			 * @returns {boolean} コミットをしている途中であれば true、そうでなければ false
			 */
			isCommitting: function() {
				return this._isCommitting;
			},

			/**
			 * UNDO 操作が可能な状態であるかを返す。
			 *
			 * @returns {boolean} 操作可能であれば true、そうでなければ false
			 */
			canUndo: function() {
				return this._editHistory.length !== 0;
			},

			/**
			 * REDO 操作が可能な状態であるかを返す。
			 *
			 * @returns {boolean} 操作可能であれば true、そうでなければ false
			 */
			canRedo: function() {
				return this._undoHistory !== 0;
			},


			// -- データを編集するメソッド -- //

			/**
			 * 編集コマンドを作成するためのオブジェクトを返します。
			 *
			 * @returns {EditCommandBuilder} 編集コマンドを作成するためのオブジェクト
			 */
			commandBuilder: function() {
				return new EditCommandBuilder();
			},

			/**
			 * データを編集する。
			 *
			 * @param {EditCommand} editCommand 編集コマンド
			 */
			edit: function(editCommand) {
				var validator = ctx.argsValidator('public');

				validator.arg('editCommnad', editCommand, function(v) {
					v.notNull();
					v.instanceOf(EditCommand);
				});


				this._changes = [];

				editCommand.apply(this._edit);
				this._editHistory.push(editCommand);

				this._dispatchEditEvent('edit');
			},

			/**
			 * UNDO 操作を実行する。（ひとつ前の編集をとりやめる）
			 */
			undo: function() {
				this._changes = [];

				var command = this._editHistory.pop();
				this._undoHistory.push(command);

				// 一度実行したコマンドなので成功するはず
				command.revert(this._edit);

				this._dispatchEditEvent('undo');
			},

			/**
			 * REDO 操作を実行する。（ひとつ前のとりやめた編集をやり直す）
			 */
			redo: function() {
				this._changes = [];

				var command = this._undoHistory.pop();
				this._editHistory.push(command);

				// 一度実行したコマンドなので成功するはず
				command.apply(this._edit);

				this._dispatchEditEvent('redo');
			},

			/**
			 * 変更をコミットします。
			 * <p>
			 * コミット時のイベント発火などの具体的な処理の順序は以下のようになります。
			 * <ul>
			 * <li>commitStart イベントの発火</li>
			 * <li>isCommiting() が true を返すようになる</li>
			 * <li>コミット処理を実行</li>
			 * <li>isCommiting() が false を返すようになる</li>
			 * <li>commitSuccess/commitError イベントのどちらかが発火</li>
			 * <li>commitComplete イベントの発火</li>
			 * </p>
			 *
			 * @fires DataSource#commitStart
			 * @fires DataSource#commitSuccess
			 * @fires DataSource#commitError
			 * @fires DataSource#commitComplete
			 */
			commit: function() {
				if (this._isCommitting) {
					throw error.DuplicateCommit.createError();
				}


				this.dispatchEvent({
					type: 'commitStart'
				});

				this._isCommitting = true;


				var promise = this._dataAccessor.commit(this._edit);


				var endCommitting = this.own(function() {
					this._isCommitting = false;
				});

				var success = this.own(function(result) {
					this._edit.reset();
					this._editHistory = [];
					this._undoHistory = [];

					this.dispatchEvent({
						type: 'commitSuccess',
						result: result
					});
				});

				var fail = this.own(function() {
					this.dispatchEvent({
						type: 'commitError',
						args: argsToArray(arguments)
					});
				});

				var complete = this.own(function() {
					this.dispatchEvent({
						type: 'commitComplete'
					});

					this._isCommitting = false;
				});

				// MEMO: 本当は then にしたい
				promise.always(endCommitting);
				promise.then(success, fail).always(complete);
			},

			/**
			 * コミット前の編集をまとめて取り消す。
			 *
			 * @fires DataSource#rollback
			 */
			rollback: function() {

				// MEMO: commit 中に rollback をできても良いか考える

				this._edit.reset();
				this._editHistory = [];
				this._undoHistory = [];

				this.dispatchEvent({
					type: 'rollback'
				});
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {Edit}
			 */
			_edit: null,

			/**
			 * @private
			 * @type {DataAccessor}
			 */
			_dataAccessor: null,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isCommitting: false,

			/**
			 * @private
			 * @type {Array.<EditCommand>}
			 */
			_editHistory: null,

			/**
			 * @private
			 * @type {Array.<EditCommand>}
			 */
			_undoHistory: null,

			/**
			 * @private
			 * @type {Array.<ChangeData>}
			 */
			_changes: null,

			/**
			 * @private
			 * @type {EventListenerSet}
			 */
			_listenerSet: null,

			/**
			 * @private
			 * @type {AbortablePromise}
			 */
			_searchPromise: null,

			/**
			 * @private
			 * @type {AbortablePromise}
			 */
			_fetchPromise: null,

			/**
			 * @private
			 * @type {AbortablePromise}
			 */
			_findPromise: null,


			// --- Private Method --- //

			/**
			 * @private
			 * @param {EditTypeString} editType
			 */
			_dispatchEditEvent: function(changeType) {
				var validator = ctx.argsValidator('private');

				validator.arg('changeType', changeType, type.validateChangeTypeString);

				this.dispatchEvent({
					type: 'edit',
					changeType: changeType,
					changes: $.extend(true, [], this._changes)
				});

				this._changes = [];
			}
		};


		return {
			constructorFunction: DataSource,
			mixins: [h5.mixin.eventDispatcher, util.disposable, util.ownSupport],
			definition: dataSourceDefinition
		};
	});


	//=============================
	// SearchReference
	//=============================

	var SearchReference = util.defineClass(NAMESPACE + '.SearchReference', function(ctx) {

		/**
		 * @constructor SearchReference
		 * @class 検索結果の参照を表すクラスです。
		 */
		function SearchReference(searchParam, fetchParam, fetchRange, loadedData, fetchFunction) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('searchParam', searchParam, type.validateSearchParam);
			validator.arg('fetchParam', fetchParam, function(v) {
				v.nullable();
				type.validateFetchParam(v);
			});
			validator.arg('fetchRange', fetchRange, type.validateFetchRange);

			validator.arg('loadedData', loadedData, function(v) {
				v.notNull();
				v.array();

				v.values(type.validateDataReference);
			});

			validator.arg('fetchFunction', fetchFunction, function(v) {
				v.notNull();
				v.func();
			});

			this._searchParam = searchParam;
			this._fetchParam = fetchParam;
			this._fetchRange = fetchRange;
			this._loadedData = loadedData;
			this._fetchFunction = fetchFunction;
		}

		/** @lends SearchReference# */
		var searchReferenceDefinition = {

			// --- Metadata --- //

			/**
			 * @private
			 * @memberOf _SearchReference
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * 検索のパラメータを返します。
			 *
			 * @returns {SearchParam} 検索のパラメータ
			 */
			getSearchParam: function() {
				return this._searchParam;
			},

			/**
			 * フェッチのパラメータを返します。
			 *
			 * @returns {FetchParam} フェッチのパラメータ
			 */
			getFetchParam: function() {
				return this._fetchParam;
			},

			/**
			 * フェッチの範囲を返します。
			 *
			 * @returns {FetchRange} 検索の範囲
			 */
			getFetchRange: function() {
				return this._fetchRange;
			},

			/**
			 * 指定したインデックスのデータがロード済みであるかを返します。
			 *
			 * @param {Index} インデックス
			 * @returns {boolean} ロード済であれば true、そうでなければ false
			 */
			isLoaded: function(index) {
				var validator = ctx.argsValidator('public');

				validator.arg('index', index, type.validateIndex);

				if (this._loadedData.length <= index) {
					return false;
				}

				return this._loadedData[index].isLoaded;
			},

			/**
			 * すべてのデータがロード済みであるかを返します。
			 *
			 * @returns {boolean} すべてロード済みであれば true、そうでなければ false
			 */
			isLoadedAll: function() {
				return util.every(this._loadedData, function(obj) {
					return obj.isLoaded;
				});
			},

			/**
			 * ロード済みのデータを同期的に取得します。
			 *
			 * @param {Index} index インデックス
			 */
			getLoadedData: function(index) {
				var validator = ctx.argsValidator('public');

				validator.arg('index', index, type.validateIndex);

				// MEMO: チェックはしてないけどやるかも?
				return this._loadedData[index].data;
			},

			/**
			 * データに対する参照の配列を返します。
			 *
			 * @returns {Array.<DataReference>} 参照の配列
			 */
			getDataReferences: function() {
				return this._loadedData;
			},

			/**
			 * @returns {AbortablePromise.<FetchResult>} フェッチ結果を返す Promise
			 */
			fetch: function() {
				return this._fetchFunction();
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {SearchParam}
			 */
			_searchParam: null,

			/**
			 * @private
			 * @type {FetchParam}
			 */
			_fetchParam: null,

			/**
			 * @private
			 * @type {FetchRange}
			 */
			_fetchRange: null,

			/**
			 * @private
			 * @type {Array.<DataReference>}
			 */
			_loadedData: null,

			/**
			 * @private
			 * @type {function(): AbortablePromise.<SearchResult>}
			 */
			_fetchFunction: null
		};

		return {
			constructorFunction: SearchReference,
			definition: searchReferenceDefinition
		};
	});

	//=============================
	// DataSearcher
	//=============================

	// ---- DataSearcher Base ---- //
	var DataSearcher = util.defineAbstractClass(NAMESPACE + '.DataSearcher', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor DataSearcher
		 * @class データの検索を管理するクラスです。
		 * @mixes EventDispatcher
		 * @mixes Disposable
		 * @mixes OwnSupport
		 */
		function DataSearcher() {}

		var abstractMethods = [

		/**
		 * データのIDを持つプロパティ名を返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name getIdProperty
		 * @returns {PropertyName} IDを持つプロパティ名
		 */
		'getIdProperty',

		/**
		 * 検索の準備ができているか返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name isReady
		 * @returns {boolean} 準備できていれば true、そうでなければ false
		 */
		'isReady',

		/**
		 * 検索パラメータの変更中であるかを返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name isChangingSearchParam
		 * @returns {boolean} 検索パラメータの変更中であれば true、そうでなければ false
		 */
		'isChangingSearchParam',

		/**
		 * リフレッシュ中であるかを返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name isRefreshing
		 * @returns {boolean} リフレッシュ中であれば true、そうでなければ false
		 */
		'isRefreshing',

		/**
		 * 現在の検索パラメータを返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name getSearchParam
		 * @returns {?LocalSearchParam} 検索パラメータ（Ready でない場合は null）
		 */
		'getSearchParam',

		/**
		 * 現在のフェッチパラメータを返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name getFetchParam
		 * @returns {?FetchParam} フェッチパラメータ（Ready でない場合は null）
		 */
		'getFetchParam',

		/**
		 * 検索結果に含まれるデータの数を返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name getCount
		 * @returns {Length} データの数
		 */
		'getCount',

		/**
		 * 範囲を指定してデータへの参照を返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name getReference
		 * @param {FetchRange1D} range 参照する範囲
		 * @returns {SearchReference} 範囲への参照
		 */
		'getReference',

		/**
		 * データIDを指定をしてデータの参照を返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name findData
		 * @param {DataId} dataId データのID
		 * @returns {DataReference} データへの参照
		 */
		'findData',

		/**
		 * データソースを取得します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name getDataSource
		 * @returns {DataSource} データソース
		 */
		'getDataSource',

		/**
		 * 検索結果に含まれるすべてのデータのIDを返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name getDataIdAll
		 * @returns {Array.<DataId>} データIDの配列
		 * @throws {NotYetReady} Ready でない場合
		 * @throws {NotSupported} サポートされない場合
		 */
		'getDataIdAll',

		/**
		 * フィルタ前のすべてのデータの集合を返します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name Set
		 * @returns {DataSet} フィルタ前のすべてのデータの集合（Readyでなければ null が返る）
		 * @throws {NotSupported} サポートされない場合
		 */
		'getSourceDataSet',

		/**
		 * 検索パラメータの初期設定をします。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name changeSearchParam
		 * @param {SearchParam} searchParam 検索パラメータ
		 * @throws {AlreadySearch} Ready である場合
		 */
		'initSearchParam',

		/**
		 * 検索パラメータを変更します。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name changeSearchParam
		 * @param {SearchParam} searchParam 検索パラメータ
		 * @throws {NotYetReady} Ready でない場合
		 * @fires DataSearcher#changeSearchStart
		 * @fires DataSearcher#changeSearchSuccess
		 * @fires DataSearcher#changeSearchError
		 * @fires DataSearcher#changeSearchComplete
		 */
		'changeSearchParam',

		/**
		 * リフレッシュします。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name refresh
		 * @throws {NotYetReady} Ready でない場合
		 * @fires DataSearcher#refreshSearchStart
		 * @fires DataSearcher#refreshSearchSuccess
		 * @fires DataSearcher#refreshSearchError
		 * @fires DataSearcher#refreshSearchComplete
		 */
		'refresh',

		/**
		 * 検索条件とデータをクリアします。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name clear
		 * @fires DataSearcher#changeSearchStart
		 * @fires DataSearcher#changeSearchSuccess
		 * @fires DataSearcher#changeSearchComplete
		 */
		'clear',

		/**
		 * ツリーを開きます。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name openTree
		 * @param {DataId} dataId
		 * @throws {NotYetReady} Ready でない場合
		 * @throws {NotSupported} サポートされない場合
		 */
		'openTree',

		/**
		 * ツリーを閉じます。
		 *
		 * @method
		 * @public
		 * @abstract
		 * @memberOf DataSearcher#
		 * @name closeTree
		 * @param {DataId} dataId
		 * @throws {NotYetReady} Ready でない場合
		 * @throws {NotSupported} サポートされない場合
		 */
		'closeTree'];

		/** @lends DataSearcher# */
		var dataSearcherDefinition = {

			// --- Metadata --- //

			/**
			 * このコメントは Eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _DataSearcher
			 */
			__name: ctx.className

		// --- Public Event --- //

		/**
		 * 検索の準備ができたことを表すイベントです。
		 *
		 * @event DataSearcher#readySearch
		 * @type {ReadySearchEvent}
		 */

		/**
		 * 検索条件の変更を開始したことを表すイベントです。
		 *
		 * @event DataSearcher#changeSearchStart
		 * @type {ChangeSearchStartEvent}
		 */

		/**
		 * 検索条件の変更が成功したことを表すイベントです。
		 *
		 * @event DataSearcher#changeSearchSuccess
		 * @type {ChangeSearchSuccessEvent}
		 */

		/**
		 * 検索条件の変更が失敗したことを表すイベントです。
		 *
		 * @event DataSearcher#changeSearchError
		 * @type {ChangeSearchErrorEvent}
		 */

		/**
		 * 検索条件の変更が完了したことを表すイベントです。
		 * <p>
		 * このイベントは検索条件の変更の成否に関わらず発生します。
		 * </p>
		 *
		 * @event DataSearcher#changeSearchComplete
		 * @type {ChangeSearchCompleteEvent}
		 */


		/**
		 * データのリフレッシュを開始したことを表すイベントです。
		 *
		 * @event DataSearcher#refreshSearchStart
		 * @type {RefreshSearchStartEvent}
		 */

		/**
		 * データのリフレッシュが成功したことを表すイベントです。
		 *
		 * @event DataSearcher#refreshSearchSuccess
		 * @type {RefreshSearchSuccessEvent}
		 */

		/**
		 * データのリフレッシュが失敗したことを表すイベントです。
		 *
		 * @event DataSearcher#refreshSearchError
		 * @type {RefreshSearchErrorEvent}
		 */

		/**
		 * データのリフレッシュが完了したことを表すイベントです。
		 * <p>
		 * このイベントはリフレッシュの成否に関わらず発生します。
		 * </p>
		 *
		 * @event DataSearcher#refreshSearchComplete
		 * @type {RefreshSearchCompleteEvent}
		 */


		// -- DataSource から伝搬してきたイベント -- //
		/**
		 * 編集によってデータが変更されたことを表すイベントです。
		 *
		 * @event DataSearcher#edit
		 * @type {EditEvent}
		 */

		/**
		 * 元データが変化したことを表すイベントです。
		 *
		 * @event DataSearcher#changeSource
		 * @type {ChangeSourceEvent}
		 */

		/**
		 * コミットが開始されたことを表すイベントです。
		 *
		 * @event DataSearcher#commitStart
		 * @type {CommitStartEvent}
		 */

		/**
		 * コミットが成功したことを表すイベントです。
		 *
		 * @event DataSearcher#commitSuccess
		 * @type {CommitSuccessEvent}
		 */

		/**
		 * コミットが失敗したことを表すイベントです。
		 *
		 * @event DataSearcher#commitError
		 * @type {CommitErrorEvent}
		 */

		/**
		 * コミットが完了したことを表すイベントです。
		 * <p>
		 * このイベントはコミットの成否に関わらず呼び出されます。
		 * </p>
		 *
		 * @event DataSearcher#commitComplete
		 * @type {CommitCompleteEvent}
		 */

		/**
		 * ロールバックされたことを表すイベント。
		 *
		 * @event DataSearcher#rollback
		 * @type {RollbackEvent}
		 */

		};

		return {
			constructorFunction: DataSearcher,
			abstractMethods: abstractMethods,
			mixins: [h5.mixin.eventDispatcher, util.disposable, util.ownSupport],
			definition: dataSearcherDefinition
		};
	});


	// ---- AllFetchSearcher ---- //

	var AllFetchSearcher = util.defineClass(NAMESPACE + '.AllFetchSearcher', function(ctx) {

		var log = ctx.log;

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor AllFetchSearcher
		 * @class 最初にすべてのデータを読み込んだ上で、検索を行う {@DataSearcher} です。
		 * @extends DataSearcher
		 * @param {DataSource} dataSource データソース
		 */
		function AllFetchSearcher(dataSource) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('dataSource', dataSource, function(v) {
				v.notNull();
				v.instanceOf(DataSource);
			});

			this._dataSource = dataSource;
			this._searchParam = null;

			this._isReady = false;
			this._isChangingSearchParam = false;
			this._isRefreshing = false;
			this._cache = [];
			this._idToIndex = {};

			this._listenerSet = util.createEventListenerSet(this);
		}


		var eventListeners = {

			_dataSource: {

				changeSource: function(event) {
					var validator = ctx.argsValidator('listener');

					validator.arg('event', event, type.validateChangeSourceEvent);

					util.forEach(event.changed, function(change) {
						if (change.type === 'addData') {

							this._addData(change, true);

						} else if (change.type === 'removeData') {

							this._removeData(change, true);

						} else if (change.type === 'replaceValue') {

							this._replaceValue(change, true);

						} else {
							log.warn('対応できない変更イベントなので無視しました: {0}', util.toVerboseString(change));
						}
					});

					this.dispatchEvent({
						type: 'changeSource',
						changeType: event.changeType,
						changes: util.map(event.changes, this.own(function(change) {
							return this._appendIndex(change);
						}))
					});
				},

				edit: function(event) {
					var validator = ctx.argsValidator('listener');

					validator.arg('event', event, type.validateEditEvent);


					util.forEach(event.changes, this.own(function(change) {
						if (change.type === 'addData') {

							this._addData(change, false);

						} else if (change.type === 'removeData') {

							this._removeData(change, false);

						} else if (change.type === 'replaceValue') {

							this._replaceValue(change, false);

						} else {
							log.warn('対応できない変更イベントなので無視しました: {0}', util.toVerboseString(change));
						}
					}));

					this.dispatchEvent({
						type: 'edit',
						changeType: event.changeType,
						changes: util.map(event.changes, this.own(function(change) {
							return this._appendIndex(change);
						}))
					});
				},

				commitStart: 'propagate',

				commitSuccess: function(event) {
					this._toUnchangedCache();
					this.dispatchEvent(event);
				},

				commitError: 'propagate',

				commitComplete: 'propagate',

				rollback: function(event) {
					this._toUnchangedCache();
					this.dispatchEvent(event);
				}
			}
		};

		/** @lends AllFetchSearcher# */
		var allFetchSearcherDefinition = {

			// --- Metadata --- //

			/**
			 * このコメントは Eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _AllFetchSearcher
			 */
			__name: ctx.className,


			// --- Implement Method --- //

			getIdProperty: function() {
				return this._dataSource.getIdProperty();
			},

			isReady: function() {
				return this._isReady;
			},

			isChangingSearchParam: function() {
				return this._isChangingSearchParam;
			},

			isRefreshing: function() {
				return this._isRefreshing;
			},

			getSearchParam: function() {
				if (this._searchParam == null) {
					return null;
				}
				return $.extend(true, {}, this._searchParam);
			},

			getFetchParam: function() {
				if (!this._isReady) {
					return null;
				}
				return $.extend(true, {}, this._fetchParam);
			},

			getCount: function() {
				return this._cache.length;
			},

			getReference: function(fetchRange) {
				var validator = ctx.argsValidator('public');
				validator.arg('fetchRange', fetchRange, type.validateFetchRange1D);

				var end = fetchRange.index + fetchRange.length;
				if (this._cache.length < end) {
					// アクセスするのは end - 1
					throw error.IndexOutOfBounds.createError(end - 1);
				}

				var searchParam = this.getSearchParam();
				var fetchParam = this.getFetchParam();

				var dataArray = this._cache.slice(fetchRange.index, end);
				var fetchResult = {
					fetchParam: fetchParam,
					fetchRange: fetchRange,
					dataArray: dataArray
				};

				var loaded = util.map(dataArray, function(data) {
					return {
						isLoaded: true,
						data: data
					};
				});

				var fetch = function() {
					return new AbortablePromise(resolve(fetchResult));
				};

				return new SearchReference(searchParam, fetchParam, fetchRange, loaded, fetch);
			},

			findData: function(dataId) {
				var validator = ctx.argsValidator('public');
				validator.arg('dataId', dataId, type.validateDataId);

				// TODO: dataId が見つからなかった場合の処理

				var data = this._dataSet[dataId];
				var editedData = this._dataSource.applyEdit(data);

				return {
					isLoaded: true,
					data: editedData
				};
			},


			getDataSource: function() {
				return this._dataSource;
			},

			getDataIdAll: function() {
				return util.map(this._cache, function(edited) {
					return edited.dataId;
				});
			},

			getSourceDataSet: function() {
				if (!this._isReady) {
					return null;
				}

				var sourceDataSet = $.extend(true, {}, this._dataSet);

				var addedSet = this._dataSource.getAddedDataSet();
				var removedSet = this._dataSource.getRemovedDataSet();

				// remove
				$.each(removedSet, this.own(function(dataId) {
					delete sourceDataSet[dataId];
				}));

				// update
				sourceDataSet = util.mapObject(sourceDataSet, this.own(function(data, dataId) {
					var edited = this._dataSource.applyEdit(data).edited;
					return {
						key: dataId,
						value: edited
					};
				}));

				// add
				$.extend(true, sourceDataSet, addedSet);

				return sourceDataSet;
			},

			initSearchParam: function(searchParam) {
				var validator = ctx.argsValidator('public');
				validator.arg('searchParam', searchParam, type.validateSearchParam);

				if (this._isReady) {
					throw error.AlreadySearch.createError();
				}

				this._searchParam = $.extend(true, {}, searchParam);
			},

			changeSearchParam: function(searchParam) {
				var validator = ctx.argsValidator('public');
				validator.arg('searchParam', searchParam, type.validateLocalSearchParam);


				this._isChangingSearchParam = true;

				var teardown = this.own(function(arg) {
					this._isChangingSearchParam = false;
					return arg;
				});

				this.dispatchEvent({
					type: 'changeSearchStart',
					searchParam: searchParam
				});

				this._fetchAllData(searchParam).then(teardown, teardown).then(this.own(function() {
					var fetchParam = $.extend(true, {}, this._fetchParam);
					this.dispatchEvent({
						type: 'changeSearchSuccess',
						searchParam: searchParam,
						fetchParam: fetchParam
					});
				}), this.own(function(e) {
					var cause = null;

					if (e.isAborted) {
						cause = e;
					} else if (e.args[0] instanceof Error) {
						cause = e.args[0];
					}

					this.dispatchEvent({
						type: 'changeSearchError',
						searchParam: searchParam,
						cause: cause
					});
				})).always(this.own(function() {
					this.dispatchEvent({
						type: 'changeSearchComplete',
						searchParam: searchParam
					});
				}));
			},

			refresh: function() {
				this._requireReady();

				this._isRefreshing = true;
				this.dispatchEvent({
					type: 'refreshSearchStart'
				});

				var teardown = this.own(function() {
					this._isRefreshing = false;
				});

				var searchParam = this._searchParam;
				this._fetchAllData(searchParam).then(teardown, teardown).then(this.own(function() {
					this.dispatchEvent({
						type: 'refreshSearchSuccess'
					});
				}), this.own(function() {
					this.dispatchEvent({
						type: 'refreshSearchError'
					});
				})).always(this.own(function() {
					this.dispatchEvent({
						type: 'refreshSearchComplete'
					});
				}));
			},

			clear: function() {
				if (this._requestPromise != null) {
					this._requestPromise.abort();
					this._requestPromise = null;
				}

				this._isChangingSearchParam = true;

				this.dispatchEvent({
					type: 'changeSearchStart'
				});

				this._dataSource.rollback();

				this._isReady = true;
				this._searchParam = {};
				this._sourceSearchParam = null;
				this._fetchParam = {};
				this._dataSet = {};
				this._cache = [];
				this._idToIndex = {};

				this._isChangingSearchParam = false;

				this.dispatchEvent({
					type: 'changeSearchSuccess'
				});
				this.dispatchEvent({
					type: 'changeSearchComplete'
				});
			},

			openTree: function() {
				throw error.NotSupported.createError('Tree');
			},

			closeTree: function() {
				throw error.NotSupported.createError('Tree');
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {DataSource}
			 */
			_dataSource: null,

			/**
			 * @private
			 * @type {LocalSearchParam}
			 */
			_searchParam: null,

			/**
			 * @private
			 * @type {ServerSearchParam}
			 */
			_sourceSearchParam: null,

			/**
			 * @private
			 * @type {FetchParam}
			 */
			_fetchParam: null,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isReady: false,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isChangingSearchParam: false,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isRefreshing: false,

			/**
			 * @private
			 * @type {EventListenerSet}
			 */
			_listenerSet: null,

			/**
			 * @private
			 * @type {Array.<Object>}
			 */
			_cache: null,

			/**
			 * @private
			 * @type {Object.<DataId, Index>}
			 */
			_idToIndex: null,

			/**
			 * @private
			 * @type {DataSet}
			 */
			_dataSet: null,

			/**
			 * @private
			 * @type {Array.<Data>}
			 */
			_originalDataArray: null,

			/**
			 * @private
			 * @type {AbortablePromise.<*>}
			 */
			_requestPromise: null,


			// --- Private Method --- //

			/**
			 * @private
			 */
			_requireReady: function() {
				if (!this._isReady) {
					throw error.NotYetReady.createError();
				}
			},

			/**
			 * @private
			 */
			_fetchAllData: function(searchParam) {

				// 検索の途中であったら前のものを中止
				if (this._requestPromise != null) {
					// changeSearchError は fail で出してくれるはず
					this._requestPromise.abort();
				}

				var sourceSearchParam = {
					filter: [],
					sort: []
				};

				util.forEach(searchParam, function(value, key) {
					if (key !== 'filter' && key !== 'sort') {
						sourceSearchParam[key] = value;
					}
				});

				// sort, filter 以外が変わっていなければ再度の問い合わせはしない
				if (util.deepEquals(sourceSearchParam, this._sourceSearchParam)) {
					this._requestPromise = null;
					this._refreshCache(searchParam);
					this._searchParam = $.extend(true, {}, searchParam);
					return resolve();
				}

				log.debug('[FETCH] Start');

				var searchPromise = this._dataSource.searchData(sourceSearchParam);
				this._requestPromise = searchPromise;


				var teardown = this.own(function(arg) {
					this._requestPromise = null;
					return arg;
				});

				return searchPromise.then(this.own(function(searchResult) {
					log.debug('[FETCH] Success: search');

					var fetchPromise;
					var fetchParam = searchResult.fetchParam;
					var length = searchResult.fetchLimit;

					// initialData ですべてそろったら fetch しない
					var initialData = searchResult.initialData;
					var hasAllData = initialData != null && initialData.isAllData;

					var fetchRange = {
						index: 0,
						length: length
					};

					if (hasAllData) {
						fetchPromise = resolve({
							fetchParam: fetchParam,
							fetchRange: initialData.fetchRange,
							dataArray: initialData.dataArray
						});
					} else {
						var dataSource = this._dataSource;
						fetchPromise = dataSource.fetchData(fetchParam, fetchRange);
					}

					this._requestPromise = fetchPromise;

					return fetchPromise;

				})).then(this.own(function(fetchResult) {

					log.debug('[FETCH] Success: fetch');
					this._fetchParam = fetchResult.fetchParam;

					this._originalDataArray = fetchResult.dataArray;

					// cache と idToIndex を更新
					this._refreshCache(searchParam);
					this._searchParam = $.extend(true, {}, searchParam);
					this._sourceSearchParam = sourceSearchParam;

					// 状態に応じてイベントを投げる
					if (!this._isReady) {
						log.trace('Ready: {0}', ctx.className);

						// Ready になったらイベントリスナを設定
						this._isReady = true;
						this._listenerSet.registerEventListeners(eventListeners);

						this.dispatchEvent({
							type: 'readySearch'
						});
					}
				})).then(teardown, teardown);
			},

			/**
			 * @private
			 * @param {LocalSearchParam} searchParam
			 */
			_refreshCache: function(searchParam) {
				var validator = ctx.argsValidator('private');
				validator.arg('searchParam', searchParam, type.validateLocalSearchParam);

				var dataArray = $.map(this._originalDataArray, this.own(function(data) {
					return this._dataSource.applyEdit(data.original);
				}));
				var addedSet = this._dataSource.getAddedDataSet();

				util.forEach(addedSet, function(data, id) {
					dataArray.push({
						dataId: id,
						editStatus: 'addded',
						original: null,
						edited: data
					});
				});


				var dataSet = util.mapObject(dataArray, function(data) {
					return {
						key: data.dataId,
						value: data.edited
					};
				});

				var sourceArray = util.map(dataArray, function(data) {
					return data.edited;
				});

				var idProperty = this._dataSource.getIdProperty();
				var searchedArray = searchDataArray(sourceArray, idProperty, searchParam);
				var wrapedArray = util.map(searchedArray, function(data) {
					return {
						dataId: data[idProperty],
						data: data
					};
				});

				this._dataSet = dataSet;
				this._updateCache(wrapedArray);
			},

			/**
			 * @private
			 * @param {Array.<LocalSearchedData>} searchedDataArray
			 */
			_updateCache: function(searchedDataArray) {
				var validator = ctx.argsValidator('private');

				validator.arg('searchedDataArray', searchedDataArray, function(v) {
					v.notNull();
					v.array();

					v.values(type.validateLocalSearchedData);
				});

				this._idToIndex = {};
				this._cache = util.map(searchedDataArray, this.own(function(searched, index) {
					var edited = this._dataSource.applyEdit(searched.data);
					if (searched.tree != null) {
						edited.tree = searched.tree;
					}
					this._idToIndex[edited.dataId] = index;

					return edited;
				}));
			},

			/**
			 * @private
			 */
			_toUnchangedCache: function() {
				this.refresh();
			},

			/**
			 * @private
			 * @param {AddDataEvent} changeEvent
			 * @param {boolean} fromServer
			 */
			_addData: function(changeEvent, fromServer) {
				var validator = ctx.argsValidator('private');

				validator.arg('changeEvent', changeEvent, type.validateAddDataEvent);
				validator.arg('fromServer', fromServer, function(v) {
					v.notNull();
					v.type('boolean');
				});

				// MEMO: サーバからの追加は一旦無視としている
				if (fromServer) {
					return;
				}

				var dataId = changeEvent.dataId;
				var edited = $.extend(true, {}, changeEvent.data);

				var newData = {
					dataId: changeEvent.dataId,
					editedStatus: fromServer ? 'unchanged' : 'added',
					original: null,
					edited: edited
				};

				// MEMO: 最後に挿入してソートはしない（リフレッシュor検索条件変更をしたときに並び替える）
				this._dataSet[dataId] = edited;
				this._cache.push(newData);
				this._idToIndex[dataId] = this._cache.length - 1;
			},

			/**
			 * @private
			 * @param {RemoveDataEvent} changeEvent
			 * @param {boolean} fromServer
			 */
			_removeData: function(changeEvent, fromServer) {
				var validator = ctx.argsValidator('private');

				validator.arg('changeEvent', changeEvent, type.validateRemoveDataEvent);
				validator.arg('fromServer', fromServer, function(v) {
					v.notNull();
					v.type('boolean');
				});

				// MEMO: サーバからの削除は一旦無視としている
				if (fromServer) {
					return;
				}

				var index = this._idToIndex[changeEvent.dataId];

				// TODO: 遅延の場合は削除フラグをたてて消さない形になるので削除の扱いを切り替えられるようにする必要がある
				delete this._dataSet[changeEvent.dataId];
				delete this._idToIndex[changeEvent.dataId];
				this._cache.splice(index, 1);

				// 削除されたあとの要素の index をつめる
				for (var i = index, len = this._cache.length; i < len; i++) {
					var data = this._cache[i];
					this._idToIndex[data.dataId] = i;
				}
			},

			/**
			 * @private
			 * @param {ReplaceValueEvent} changeEvent
			 * @param {boolean} fromServer
			 */
			_replaceValue: function(changeEvent, fromServer) {

				var validator = ctx.argsValidator('private');

				validator.arg('changeEvent', changeEvent, type.validateReplaceValueEvent);

				validator.arg('fromServer', fromServer, function(v) {
					v.notNull();
					v.type('boolean');
				});


				var dataId = changeEvent.dataId;
				var index = this._idToIndex[dataId];
				if (index == null) {
					log.warn('dataId={0} のデータが見つからずデータを変更することができませんでした');
					return;
				}

				// MEMO: oldValue の比較&警告はやったほうが良いかも

				var addedDataSet = this._dataSource.getAddedDataSet();

				// 追加分は addedData のもので上書き
				if (util.hasProperty(addedDataSet, dataId)) {
					this._cache[index].edited = addedDataSet[dataId];
					return;
				}


				// 追加以外は applyEdit を original に対して実行する
				var original = this._cache[index].original;
				this._cache[index] = this._dataSource.applyEdit(original);

				// MEMO: 値が書き変わってもすぐにはソートやフィルタを適用しない
			},

			/**
			 * {@link ChangeEvent} に index を付与します。
			 *
			 * @private
			 * @param {ChangeDataEvent} changeEvent
			 * @returns {ChangeDataEvent}
			 */
			_appendIndex: function(changeEvent) {
				var validator = ctx.argsValidator('private');

				validator.arg('changeEvent', changeEvent, type.validateChangeDataEvent);

				var index = this._idToIndex[changeEvent.dataId];

				return $.extend(true, {
					index: index
				}, changeEvent);

			},

			_diffDataArray: function(shortArray, longArray) {
				var diffArray = [];
				for (var i = 0, sLen = shortArray.length; i < sLen; i++) {
					if (shortArray[i].dataId === longArray[i].dataId) {
						continue;
					}
					for (var j = i, lLen = longArray.length; j < lLen; j++) {
						if (shortArray[i].dataId !== longArray[j].dataId) {
							diffArray.push(longArray[j]);
						}
					}
					break;
				}

				$.merge(diffArray, longArray.slice(shortArray.length));

				return diffArray;
			}
		};

		return {
			constructorFunction: AllFetchSearcher,
			superConstructorFunction: DataSearcher,
			definition: allFetchSearcherDefinition
		};
	});

	// TODO: EagerFetchDataSearcher


	// ---- LazyFetchDataSearcher ---- //

	var lazyFetchClassName = NAMESPACE + '.LazyFetchSearcher';
	var LazyFetchSearcher = util.defineClass(lazyFetchClassName, function(ctx) {

		var DEFAULT_FETCH_UNIT = 200;

		var log = ctx.log;

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor LazyFetchSearcher
		 * @class データを遅延で読み込む {@DataSearcher} です。
		 * @extends DataSearcher
		 * @param {DataSource} dataSource データソース
		 * @param {Object=} [param] パラメータ
		 * @param {Length=} [param.fetchUnit] フェッチをする際のデータを要求する単位
		 */
		function LazyFetchDataSearcher(dataSource, param) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('dataSource', dataSource, function(v) {
				v.notNull();
				v.instanceOf(DataSource);
			});
			validator.arg('param', param, function(v) {
				v.nullable();
				v.plainObject();

				v.property('fetchUnit', function(v) {
					v.nullable();
					type.validateLength(v);
					v.positiveNumber();
				});
			});

			this._dataSource = dataSource;
			if (param != null && param.fetchUnit != null) {
				this._fetchUnit = param.fetchUnit;
			}

			this._searchParam = null;

			this._count = 0;
			this._cacheDataSet = {};
			this._indexToId = {};
			this._idToIndex = {};

			this._isReady = false;
			this._isChangingSearchParam = false;
			this._isRefreshing = false;

			this._requestPromise = null;

			this._listenerSet = util.createEventListenerSet(this);
		}

		var eventListeners = {

			_dataSource: {

				changeSource: function(event) {
					var validator = ctx.argsValidator('listener');

					validator.arg('event', event, type.validateChangeSourceEvent);

					util.forEach(event.changed, function(change) {
						if (change.type === 'addData') {

							this._addData(change, true);

						} else if (change.type === 'removeData') {

							this._removeData(change, true);

						} else if (change.type === 'replaceValue') {

							this._replaceValue(change, true);

						} else {
							log.warn('対応できない変更イベントなので無視しました: {0}', util.toVerboseString(change));
						}
					});

					this.dispatchEvent({
						type: 'changeSource',
						changeType: event.changeType,
						changes: util.map(event.changes, this.own(function(change) {
							return this._appendIndex(change);
						}))
					});
				},

				edit: function(event) {
					var validator = ctx.argsValidator('listener');

					validator.arg('event', event, type.validateEditEvent);


					util.forEach(event.changes, this.own(function(change) {
						if (change.type === 'addData') {

							this._addData(change, false);

						} else if (change.type === 'removeData') {

							this._removeData(change, false);

						} else if (change.type === 'replaceValue') {

							this._replaceValue(change, false);

						} else {
							log.warn('対応できない変更イベントなので無視しました: {0}', util.toVerboseString(change));
						}
					}));

					this.dispatchEvent({
						type: 'edit',
						changeType: event.changeType,
						changes: util.map(event.changes, this.own(function(change) {
							return this._appendIndex(change);
						}))
					});
				},

				commitStart: 'propagate',

				commitSuccess: function(event) {
					this._toUnchangedCache();
					this.dispatchEvent(event);
				},

				commitError: 'propagate',

				commitComplete: 'propagate',

				rollback: function(event) {
					this._toUnchangedCache();
					this.dispatchEvent(event);
				}
			}
		};

		/** @lends LazyFetchSearcher# */
		var lazyFetchDataSearcherDefinition = {

			// --- Metadata --- //

			/**
			 * このコメントは Eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _LazyFetchSearcher
			 */
			__name: ctx.className,


			// --- Implement Method --- //

			getIdProperty: function() {
				return this._dataSource.getIdProperty();
			},

			isReady: function() {
				return this._isReady;
			},

			isChangingSearchParam: function() {
				return this._isChangingSearchParam;
			},

			isRefreshing: function() {
				return this._isRefreshing;
			},

			getSearchParam: function() {
				if (this._searchParam == null) {
					return null;
				}
				return $.extend(true, {}, this._searchParam);
			},

			getFetchParam: function() {
				if (!this._isReady) {
					return null;
				}
				return $.extend(true, {}, this._fetchParam);
			},

			getCount: function() {
				// TODO: added なデータの考慮
				return this._count;
			},

			getReference: function(fetchRange) {
				var validator = ctx.argsValidator('public');
				validator.arg('fetchRange', fetchRange, type.validateFetchRange1D);

				var end = fetchRange.index + fetchRange.length;
				if (this.getCount() < end) {
					// アクセスするのは end - 1
					throw error.IndexOutOfBounds.createError(end - 1);
				}

				var searchParam = this.getSearchParam();
				var fetchParam = this.getFetchParam();

				var array = [];
				for (var i = 0, len = fetchRange.length; i < len; i++) {
					var index = fetchRange.index + i;
					var dataId = this._indexToId[index];
					var isLoaded = dataId != null;
					var data = isLoaded ? this._cacheDataSet[dataId] : null;

					array.push({
						isLoaded: isLoaded,
						data: data
					});
				}

				var fetch = this.own(function() {
					return this._fetch(fetchRange).then(this.own(function() {

						// Eclipse の警告回避で宣言と代入を分割
						var array;
						array = [];

						for (var i = 0, len = fetchRange.length; i < len; i++) {
							var index = fetchRange.index + i;
							var dataId = this._indexToId[index];
							var data = this._cacheDataSet[dataId];

							array.push(data);
						}

						return {
							fetchParam: fetchParam,
							fetchRange: fetchRange,
							dataArray: array
						};
					}));
				});

				return new SearchReference(searchParam, fetchParam, fetchRange, array, fetch);
			},

			findData: function(dataId) {
				var validator = ctx.argsValidator('public');
				validator.arg('dataId', dataId, type.validateDataId);

				var isLoaded = util.hasProperty(this._cacheDataSet, dataId);
				var data = isLoaded ? $.extend(true, {}, this._cacheDataSet[dataId]) : null;

				return {
					isLoaded: isLoaded,
					data: data
				};
			},

			getDataSource: function() {
				return this._dataSource;
			},

			getDataIdAll: function() {
				throw error.NotSupported.createError('GetDataIdAll');
			},

			getSourceDataSet: function() {
				throw error.NotSupported.createError('GetSourceDataSet');
			},

			initSearchParam: function(searchParam) {
				var validator = ctx.argsValidator('public');
				validator.arg('searchParam', searchParam, type.validateSearchParam);

				if (this._isReady) {
					throw error.AlreadySearch.createError();
				}

				this._searchParam = $.extend(true, {}, searchParam);
			},

			changeSearchParam: function(searchParam) {
				var validator = ctx.argsValidator('public');
				validator.arg('searchParam', searchParam, type.validateSearchParam);

				this._isChangingSearchParam = true;

				var teardown = this.own(function() {
					this._isChangingSearchParam = false;
				});

				this.dispatchEvent({
					type: 'changeSearchStart',
					searchParam: searchParam
				});

				this._search(searchParam).then(teardown, teardown).then(this.own(function() {
					var fetchParam = $.extend(true, {}, this._fetchParam);
					this.dispatchEvent({
						type: 'changeSearchSuccess',
						searchParam: searchParam,
						fetchParam: fetchParam
					});
				}), this.own(function() {
					this.dispatchEvent({
						type: 'changeSearchError',
						searchParam: searchParam
					});
				})).always(this.own(function() {
					this.dispatchEvent({
						type: 'changeSearchComplete',
						searchParam: searchParam
					});
				}));
			},

			refresh: function() {
				this._requireReady();

				this._isRefreshing = true;

				var teardown = this.own(function() {
					this._isRefreshing = false;
				});

				this.dispatchEvent({
					type: 'refreshSearchStart'
				});

				this._search(this._searchParam).then(teardown, teardown).then(this.own(function() {
					this.dispatchEvent({
						type: 'refreshSearchSuccess'
					});
				}), this.own(function() {
					this.dispatchEvent({
						type: 'refreshSearchError'
					});
				})).always(this.own(function() {
					this.dispatchEvent({
						type: 'refreshSearchComplete'
					});
				}));
			},

			clear: function() {
				if (this._requestPromise != null) {
					this._requestPromise.abort();
					this._requestPromise = null;
				}

				this._isChangingSearchParam = true;

				this.dispatchEvent({
					type: 'changeSearchStart'
				});

				this._dataSource.rollback();

				this._isReady = true;
				this._searchParam = {};
				this._fetchParam = {};
				this._count = 0;
				this._cacheDataSet = {};
				this._idToIndex = {};
				this._indexToId = {};

				this._isChangingSearchParam = false;

				this.dispatchEvent({
					type: 'changeSearchSuccess'
				});

				this.dispatchEvent({
					type: 'changeSearchComplete'
				});
			},

			openTree: function() {
				throw error.NotSupported.createError('Tree');
			},

			closeTree: function() {
				throw error.NotSupported.createError('Tree');
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {DataSource}
			 */
			_dataSource: null,

			/**
			 * @private
			 * @type {LocalSearchParam}
			 */
			_searchParam: null,

			/**
			 * @private
			 * @type {FetchParam}
			 */
			_fetchParam: null,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isReady: false,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isChangingSearchParam: false,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isRefreshing: false,

			/**
			 * @private
			 * @type {EventListenerSet}
			 */
			_listenerSet: null,

			/**
			 * @private
			 * @type {AbortablePromise.<*>}
			 */
			_requestPromise: null,

			/**
			 * @private
			 * @type {Length}
			 */
			_count: null,

			/**
			 * @private
			 * @type {Length}
			 */
			_fetchUnit: DEFAULT_FETCH_UNIT,

			/**
			 * @private
			 * @type {Object.<DataId, EditedData>}
			 */
			_cacheDataSet: null,

			/**
			 * @private
			 * @type {Object.<DataId, Index>}
			 */
			_idToIndex: null,

			/**
			 * @private
			 * @type {Object.<Index, DataId>}
			 */
			_indexToId: null,


			// --- Private Method --- //

			/**
			 * @private
			 */
			_requireReady: function() {
				if (!this._isReady) {
					throw error.NotYetReady.createError();
				}
			},

			/**
			 * @private
			 * @param {SearchParam} searchParam
			 * @returns {AbortablePromise}
			 */
			_search: function(searchParam) {
				var validator = ctx.argsValidator('private');
				validator.arg('searchParam', searchParam, type.validateSearchParam);

				if (this._requestPromise != null) {
					this._requestPromise.abort();
				}

				var searchParamStr = util.toVerboseString(searchParam, 2);
				log.debug('[SEARCH] Start; searchParam={0}', searchParamStr);

				var searchPromise = this._dataSource.searchData(searchParam);
				this._requestPromise = searchPromise;

				var result = searchPromise.then(this.own(function(searchResult) {
					log.debug('[SEARCH] Success; searchParam={0}', searchParamStr);

					this._count = searchResult.fetchLimit;
					this._searchParam = $.extend(true, {}, searchParam);
					this._fetchParam = searchResult.fetchParam;

					this._cacheDataSet = {};
					this._indexToId = {};
					this._idToIndex = {};

					if (!this._isReady) {
						this._isReady = true;
						this._listenerSet.registerEventListeners(eventListeners);
						this.dispatchEvent({
							type: 'readySearch'
						});
					}

					if (searchResult.initialData != null) {
						this._receiveFetchResult(searchResult.initialData);
					}

				}), function(e) {
					log.error('[SEARCH] Error; searchParam={0}', searchParamStr);
					log.error(e);
				});

				result.always(this.own(function() {
					this._requestPromise = null;
				}));

				return result;
			},

			_fetch: function(range) {
				var firstIndex = null;
				var lastIndex = null;

				for (var i = 0, len = range.length; i < len; i++) {
					var index = range.index + i;
					if (!util.hasProperty(this._indexToId, index)) {
						if (firstIndex == null) {
							firstIndex = index;
						}
						lastIndex = index;
					}
				}

				if (firstIndex == null) {
					return resolve();
				}

				var fetchUnit = this._fetchUnit;
				var fetchIndex = Math.floor(firstIndex / fetchUnit) * fetchUnit;
				var fetchEnd = Math.ceil((lastIndex + 1) / fetchUnit) * fetchUnit;
				if (this._count < fetchEnd) {
					fetchEnd = this._count;
				}

				var fetchLength = fetchEnd - fetchIndex;
				var fetchRange = {
					index: fetchIndex,
					length: fetchLength
				};

				log.debug('[FETCH] Start: index={0}, length={1}', fetchIndex, fetchLength);

				var fetchParam = this._fetchParam;
				var receiveFetchResult = this.own(this._receiveFetchResult);

				return this._dataSource.fetchData(fetchParam, fetchRange).then(function(result) {
					log.debug('[FETCH] Success: index={0}, length={1}', fetchIndex, fetchLength);
					return result;
				}, function(e) {
					log.error('[FETCH] Error: index={0}, length={1}', fetchIndex, fetchLength);
					log.error(e);
				}).then(receiveFetchResult);
			},

			_receiveFetchResult: function(fetchResult) {
				var range = fetchResult.fetchRange;
				var dataArray = fetchResult.dataArray;

				for (var i = 0, len = range.length; i < len; i++) {
					var index = range.index + i;
					var editedData = dataArray[i];
					var dataId = editedData.dataId;

					this._cacheDataSet[dataId] = editedData;
					this._indexToId[index] = dataId;
					this._idToIndex[dataId] = index;
				}
			},

			/**
			 * @private
			 */
			_toUnchangedCache: function() {
				this.refresh();
			},

			/**
			 * @private
			 * @param {AddDataEvent} changeEvent
			 * @param {boolean} fromServer
			 */
			_addData: function(changeEvent, fromServer) {
				var validator = ctx.argsValidator('private');

				validator.arg('changeEvent', changeEvent, type.validateAddDataEvent);
				validator.arg('fromServer', fromServer, function(v) {
					v.notNull();
					v.type('boolean');
				});

				// MEMO: サーバからの追加は一旦無視としている
				if (fromServer) {
					return;
				}

				// TODO: とりあえず最後に挿入しておく
				// MEMO: 挿入位置は設定可とするべきかも
			},

			/**
			 * @private
			 * @param {RemoveDataEvent} changeEvent
			 * @param {boolean} fromServer
			 */
			_removeData: function(changeEvent, fromServer) {
				var validator = ctx.argsValidator('private');

				validator.arg('changeEvent', changeEvent, type.validateRemoveDataEvent);
				validator.arg('fromServer', fromServer, function(v) {
					v.notNull();
					v.type('boolean');
				});

				// MEMO: サーバからの削除は一旦無視としている
				if (fromServer) {
					return;
				}

				// TODO: editStatus を removed にして edited を null に
			},

			/**
			 * @private
			 * @param {ReplaceValueEvent} changeEvent
			 * @param {boolean} fromServer
			 */
			_replaceValue: function(changeEvent, fromServer) {

				var validator = ctx.argsValidator('private');

				validator.arg('changeEvent', changeEvent, type.validateReplaceValueEvent);

				validator.arg('fromServer', fromServer, function(v) {
					v.notNull();
					v.type('boolean');
				});


				var dataId = changeEvent.dataId;
				if (!util.hasProperty(this._cacheDataSet, dataId)) {
					log.warn('dataId={0} のデータが見つからずデータを変更することができませんでした');
					return;
				}

				// TODO: 追加分の対応
				// 追加以外は applyEdit を original に対して実行する
				var editedData = this._cacheDataSet[dataId];
				this._cacheDataSet[dataId] = this._dataSource.applyEdit(editedData.original);

				// MEMO: 値が書き変わってもすぐにはソートやフィルタを適用しない
			},

			/**
			 * {@link ChangeEvent} に index を付与します。
			 *
			 * @private
			 * @param {ChangeDataEvent} changeEvent
			 * @returns {?ChangeDataEvent} index を付与した Event オブジェクト（indexがわからない場合は null）
			 */
			_appendIndex: function(changeEvent) {
				var validator = ctx.argsValidator('private');

				validator.arg('changeEvent', changeEvent, type.validateChangeDataEvent);

				var index = this._idToIndex[changeEvent.dataId];
				if (typeof index === 'undefined') {
					index = null;
				}

				return $.extend(true, {
					index: index
				}, changeEvent);
			}
		};

		return {
			constructorFunction: LazyFetchDataSearcher,
			superConstructorFunction: DataSearcher,
			definition: lazyFetchDataSearcherDefinition
		};
	});

	//=============================
	// SingleDataSearcher
	//=============================

	var SingleDataSearcher = util.defineClass(NAMESPACE + '.SingleDataSearcher', function(ctx) {

		var log = ctx.log;

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor SingleDataSearcher
		 * @class 特定のIDのデータへの参照を表現するクラスです。
		 * @mixes EventDispatcher
		 * @mixes Disposable
		 * @mixes OwnSupport
		 * @param {DataSource} dataSource データソース
		 */
		function SingleDataSearcher(dataSource) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('dataSource', dataSource, function(v) {
				v.notNull();
				v.instanceOf(DataSource);
			});


			this._dataSource = dataSource;
			this._dataId = null;
			this._listenerSet = util.creatEventListenerSet(this);

			this._isReady = false;
			this._isChangingDataId = false;
			this._isRefreshing = false;

			this._listenerSet.registerEventListeners(eventListeners);
		}

		function changeEventListener(event) {
			/* jshint validthis: true */

			// changeEvent に changeType を付与して発火
			util.forEach(event.changed, this.own(function(change) {
				if (change.dataId !== this._dataId) {
					return;
				}
				var event = $.extend({
					changeType: event.changeType
				}, change);
				this.dispatchEvent(event);
			}));
		}

		var eventListeners = {
			_dataSource: {
				changeSource: changeEventListener,
				edit: changeEventListener,

				commitStart: 'propagate',
				commitSuccess: 'propagate',
				commitError: 'propagate',
				commitComplete: 'propagate',
				rollback: 'propagate'
			}
		};

		/** @lends SingleDataSearcher# */
		var singleDataSearcherDefinition = {

			// --- Metadata --- //

			/**
			 * このコメントは eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _SingleDataSearcher
			 */
			__name: ctx.className,


			// --- Public Event --- //

			/**
			 * @event SingleDataSearcher#changeDataIdStart
			 * @type {ChangeDataIdStartEvent}
			 */

			/**
			 * @event SingleDataSearcher#changeDataIdSuccess
			 * @type {ChangeDataIdSuccessEvent}
			 */

			/**
			 * @event SingleDataSearcher#changeDataIdError
			 * @type {ChangeDataIdErrorEvent}
			 */

			/**
			 * @event SingleDataSearcher#changeDataIdComplete
			 * @type {ChangeDataIdCompleteEvent}
			 */


			// --- Public Method --- //
			/**
			 * データがロード済みであるかを返します。
			 *
			 * @returns {boolean} ロード済みであれば true、そうでなければ false
			 */
			isLoaded: function() {
				return this._data != null;
			},

			/**
			 * 参照しているIDを返します。
			 *
			 * @returns {DataId} 参照しているID
			 */
			getDataId: function() {
				return this._dataId;
			},

			/**
			 * 参照しているデータを返します。
			 *
			 * @returns {EditedData} 参照しているデータ
			 */
			getData: function() {
				return $.extend(true, {}, this._editedData);
			},

			/**
			 * データソースを返します。
			 *
			 * @returns {DataSource} データソース
			 */
			getDataSource: function() {
				return this._dataSource;
			},

			/**
			 * 参照する ID を変更します。
			 *
			 * @param {DataId} dataId データのID
			 * @fires SingleDataSearcher#changeDataIdStart
			 * @fires SingleDataSearcher#changeDataIdSuccess
			 * @fires SingleDataSearcher#changeDataIdError
			 * @fires SingleDataSearcher#changeDataIdComplete
			 */
			changeDataId: function(dataId) {
				var validator = ctx.argsValidator('public');
				validator.arg('dataId', dataId, type.validateDataId);

				this._findData(dataId);
			},

			/**
			 * 参照する ID の変更の途中であるかを返します。
			 *
			 * @returns {boolean} 変更の途中であれば true、そうでなければ false
			 */
			isChangingDataId: function() {
				return this._isChagingDataId;
			},

			/**
			 * 値を置き換えます。
			 *
			 * @param {PropertyName} propertyName
			 * @param {Value} oldValue
			 * @param {Value} newValue
			 * @throws {NotYetReady}
			 */
			replaceValue: function(propertyName, oldValue, newValue) {
				var validator = ctx.argsValidator('public');

				validator.arg('propertyName', propertyName, type.validatePropertyName);
				validator.arg('oldValue', oldValue, type.validateValue);
				validator.arg('newValue', newValue, type.validateValue);

				if (!this.isLoaded()) {
					throw error.NotYetReady.createError();
				}

				var builder = this._dataSource.commandBuilder();
				var command = builder.replaceValue(this._dataId, propertyName, oldValue, newValue);
				this._dataSource.edit(command);
			},


			// --- Private Property --- //

			_dataSource: null,

			_listenerSet: null,

			_dataId: null,

			_editedData: null,

			_isReady: null,

			_isChagingDataId: null,

			_findPromise: null,


			// --- Private Method --- //

			_findData: function(dataId) {
				var validator = ctx.argsValidator('private');

				validator.arg('dataId', dataId, type.validateDataId);

				if (this._findPromise != null) {
					this._findPromise.abort();
				}


				this._isChagingDataId = true;

				this.dispatchEvent({
					type: 'changeDataIdStart',
					dataId: dataId
				});

				var failFetch = this.own(function(e) {
					log.error('[FETCH] Error');
					log.error(e);

					this._findPromise = null;
					this._isChagingDataId = false;

					this.dispatchEvent({
						type: 'changeDataIdError',
						dataId: dataId
					});

					this.dispatchEvent({
						type: 'changeDataIdComplete',
						dataId: dataId
					});
				});


				this._findPromise = this._dataSource.findData(dataId);

				this._findPromise.then(this.own(function(editedData) {

					this._dataId = dataId;
					this._editedData = editedData;

					this._isChagingDataId = false;

					this.dispatchEvent({
						type: 'changeDataIdSuccess',
						dataId: dataId
					});

					this.dispatchEvent({
						type: 'changeDataIdComplete',
						dataId: dataId
					});
				})).fail(failFetch);
			}
		};

		return {
			constructorFunction: SingleDataSearcher,
			mixins: [h5.mixin.eventDispatcher, util.disposable, util.ownSupport],
			definition: singleDataSearcherDefinition
		};
	});


	// ---- PagingDataSearcher ---- //

	//=============================
	// PagingDataSearcher
	//=============================

	var PagingDataSearcher = util.defineClass(NAMESPACE + '.PagingDataSearcher', function(ctx) {

		var log = ctx.log;

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor PagingDataSearcher
		 * @class ページング機能を持った{@DataSearcher} です。
		 * @mixes EventDispatcher
		 * @mixes Disposable
		 * @mixes OwnSupport
		 * @param {DataSearcher} dataSearcher コンポジションするsearcher
		 * @param {Number} pageSize 1ページに表示する件数
		 */
		function PagingDataSearcher(dataSearcher, pageSize) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('dataSearcher', dataSearcher, function(v) {
				v.notNull();
				v.instanceOf(DataSearcher);
			});
			validator.arg('pageSize', pageSize, function(v) {
				v.notNull();
				v.positiveNumber();
			});

			this._dataSearcher = dataSearcher;
			this._pageSize = pageSize;
			this._currentPage = 1;

			this._listenerSet = util.createEventListenerSet(this);
			this._listenerSet.registerEventListeners(eventListeners);
		}

		var eventListeners = {
			_dataSearcher: {
				readySearch: 'propagate',
				changeSearchStart: 'propagate',
				changeSearchSuccess: function(event) {
					this._currentPage = 1;
					this.dispatchEvent(event);
				},
				changeSearchError: function(event) {
					this.dispatchEvent(event);
				},
				changeSearchComplete: function(event) {
					this.dispatchEvent(event);
				},
				refreshSearchStart: 'propagate',
				refreshSearchSuccess: 'propagate',
				refreshSearchError: 'propagate',
				refreshSearchComplete: 'propagate',

				changeSource: function(event) {
					var lastPage = this.totalPages();
					if (this._currentPage > lastPage) {
						this.movePage(lastPage);
					}
					this.dispatchEvent(event);
				},

				edit: 'propagate',
				commitStart: 'propagate',
				commitSuccess: 'propagate',
				commitError: 'propagate',
				commitComplete: 'propagate',
				rollback: 'propagate'
			}
		};

		/** @lends PagingDataSearcher# */
		var pagingDataSearcherDefinition = {
			// --- Metadata --- //

			/**
			 * このコメントは Eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _PagingDataSearcher
			 */
			__name: ctx.className,

			// --- Implement Method --- //

			getIdProperty: function() {
				return this._dataSearcher.getIdProperty();
			},

			isReady: function() {
				return this._dataSearcher.isReady();
			},

			isChangingSearchParam: function() {
				return this._dataSearcher.isChangingSearchParam();
			},

			isRefreshing: function() {
				return this._dataSearcher.isRefreshing();
			},

			getSearchParam: function() {
				return this._dataSearcher.getSearchParam();
			},

			getFetchParam: function() {
				return this._dataSearcher.getFetchParam();
			},

			// getCount()は現在のページのデータ件数を返します
			// データ総件数を取得したい場合はgetTotalCount()を呼び出してください
			getCount: function() {
				if (this._dataSearcher.getCount() == 0) {
					return 0;
				}
				var remind = this._dataSearcher.getCount() % this._pageSize;
				if (remind > 0 && this._currentPage === this.getTotalPages()) {
					return remind;
				}
				return this._pageSize;
			},

			getTotalCount: function() {
				if (this._dataSearcher.getCount() == 0) {
					return 0;
				}
				return this._dataSearcher.getCount();
			},

			getReference: function(fetchRange) {
				var validator = ctx.argsValidator('public');
				validator.arg('fetchRange', fetchRange, type.validateFetchRange1D);

				// ページ範囲から外れていたらエラー
				var end = fetchRange.index + fetchRange.length;
				if (end > this.getCount()) {
					throw error.indexOutOfBounds.createError(end - 1);
				}

				fetchRange.index = this._getStartIndex() + fetchRange.index;
				return this._dataSearcher.getReference(fetchRange);
			},

			findData: function(dataId) {
				var ids = this.getDataIdAll();
				if (ids.indexOf(dataId) === -1) {
					throw new Error('ページ範囲外です');
				}
				return this._dataSearcher.findData(dataId);
			},

			getDataSource: function() {
				return this._dataSearcher.getDataSource();
			},

			getDataIdAll: function() {
				var ids = this._dataSearcher.getDataIdAll();
				return ids.slice(this._getStartIndex(), this.getCount());
			},

			getSourceDataSet: function() {
				return this._dataSearcher.getSourceDataSet();
			},

			initSearchParam: function(searchParam) {
				this._dataSearcher.initSearchParam(searchParam);
			},

			changeSearchParam: function(searchParam) {
				this._dataSearcher.changeSearchParam(searchParam);
			},

			refresh: function() {
				this._dataSearcher.refresh();
			},

			clear: function() {
				this._dataSearcher.clear();
				this._currentPage = 1;
			},

			openTree: function(dataId) {
				this._dataSearcher.openTree();
			},

			closeTree: function(dataId) {
				this._closeTree();
			},

			// PagingDataSearcher固有のメソッド
			getCurrentPage: function() {
				return this._currentPage;
			},

			getTotalPages: function() {
				var pages = Math.ceil(this._dataSearcher.getCount() / this._pageSize);
				if (pages <= 0) {
					return 1;
				}
				return pages;
			},

			getPageSize: function() {
				return this._pageSize;
			},

			setPageSize: function(pageSize) {
				this._pageSize = pageSize;

				this._currentPage = 1;
				this.dispatchEvent({
					type: 'changeSource'
				});
			},

			movePage: function(pageNumber) {
				var start = (pageNumber - 1) * this._pageSize;
				var end = start + this._pageSize;

				var max = this._dataSearcher.getCount();
				end = Math.min(max, end);

				if (pageNumber <= 0 || end <= start && pageNumber !== 1) {
					throw new Error('存在しないページです');
				}

				this._currentPage = pageNumber;
				this.dispatchEvent({
					type: 'changeSource'
				});
			},

			// --- Private Property --- //

			/**
			 * @private
			 * @type {DataSearcher}
			 */
			_dataSearcher: null,

			/**
			 * @private
			 * @type {Number}
			 */
			_pageSize: null,

			/**
			 * @private
			 * @type {Number}
			 */
			_currentPage: null,

			// --- Private Method --- //
			_isLastPage: function() {
				return this._currentPage == this.getTotalPages();
			},

			_getStartIndex: function() {
				return (this._currentPage - 1) * this._pageSize;
			}

		};

		return {
			constructorFunction: PagingDataSearcher,
			superConstructorFunction: DataSearcher,
			definition: pagingDataSearcherDefinition
		};
	});

	//=============================
	// SearchConfig
	//=============================

	// TODO: 宣言的な定義オブジェクトから searchParam を設定する口を作る


	//=============================
	//
	//=============================

	// TODO: DataSource 作成補助関数を作る


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/** @lends h5.ui.components.datagrid.data */
	var exports = {

		// TODO: dataSource を作成する関数

		// --- Private Class --- //

		// テスト用にクラスを公開
		// TODO: ビルドでテスト以外では公開しないようにするか検討
		_privateClass: {
			AbortablePromise: AbortablePromise,
			Edit: Edit,
			AddDataCommand: AddDataCommand,
			RemoveDataCommand: RemoveDataCommand,
			ReplaceValueCommand: ReplaceValueCommand,
			BatchCommand: BatchCommand,
			EditCommandBuilder: EditCommandBuilder,
			LocalDataAccessor: LocalDataAccessor,
			AjaxDataAccessor: AjaxDataAccessor,
			DataSource: DataSource,
			AllFetchSearcher: AllFetchSearcher,
			LazyFetchSearcher: LazyFetchSearcher,
			PagingDataSearcher: PagingDataSearcher,
			SingleDataSearcher: SingleDataSearcher
		},

		_privateMethod: {
			calcTreePath: calcTreePath
		}
	};


	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);

})();

/* ----- h5.ui.components.datagrid.logic ----- */
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.logic';

	/**
	 * @name logic
	 * @memberOf h5.ui.components.datagrid
	 * @namespace
	 */
	h5.u.obj.ns(NAMESPACE);


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	var SELECTED_BORDER_WIDTH = 3;


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var datagrid = h5.ui.components.datagrid;
	var util = datagrid.util;
	var type = datagrid.type;
	var error = datagrid.error;

	var defineClass = util.defineClass;
	var defineAbstractClass = util.defineAbstractClass;


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Function
	//=============================

	function compareSize(a, b) {
		if (a < b) {
			return -1;
		}
		if (b < a) {
			return 1;
		}
		return 0;
	}


	//=============================
	// Variable
	//=============================

	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	//=============================
	// DataSelector
	//=============================

	// ---- DataSelector Base ---- //

	var DataSelector = defineAbstractClass(NAMESPACE + '.DataSelector', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor DataSelector
		 * @class データの選択を管理するクラスです。
		 * @mixes Disposable
		 */
		function DataSelector() {}

		var abstractMethods = [

		/**
		 * データを選択します。
		 *
		 * @public
		 * @method
		 * @memberOf DataSelector#
		 * @param {DataId} dataId データのID
		 * @returns {boolean} 選択状態に変更があったら true, そうでなければ false
		 */
		'select',

		/**
		 * すべてのデータを選択します。
		 *
		 * @public
		 * @method
		 * @memberOf DataSelector#
		 * @returns {boolean} 選択状態に変更があったら true, そうでなければ false
		 * @throws {NotSupported}
		 */
		'selectAll',

		/**
		 * データの選択を解除します。
		 *
		 * @public
		 * @method
		 * @memberOf DataSelector#
		 * @param {DataId} dataId データのID
		 * @returns {boolean} 選択状態に変更があったら true, そうでなければ false
		 */
		'unselect',

		/**
		 * すべてのデータの選択を解除します。
		 *
		 * @public
		 * @method
		 * @memberOf DataSelector#
		 * @returns {boolean} 選択状態に変更があったら true, そうでなければ false
		 */
		'unselectAll',

		/**
		 * データが選択されているか返します。
		 *
		 * @public
		 * @method
		 * @memberOf DataSelector#
		 * @param {DataId} dataId データのID
		 * @returns {boolean} 選択されていれば true、そうでなければ false
		 */
		'isSelected',

		/**
		 * 選択されているデータのIDの一覧を返します。
		 *
		 * @public
		 * @method
		 * @memberOf DataSelector#
		 * @returns {Array.<DataId>}
		 * @throws {NotSupported}
		 */
		'getSelectedAll',

		/**
		 * 選択の結果を返します。
		 *
		 * @public
		 * @method
		 * @memberOf DataSelector#
		 * @returns {DataSelectResult}
		 */
		'getDataSelectResult'];

		/** @lends DataSelector# */
		var dataSelectorDefinition = {

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _DataSelector
			 */
			__name: ctx.className
		};

		return {
			constructorFunction: DataSelector,
			abstractMethods: abstractMethods,
			mixins: [util.ownSupport, util.disposable],
			definition: dataSelectorDefinition
		};
	});


	// ---- Single Data Selector ---- //

	var SingleDataSelector = defineClass(NAMESPACE + '.SingleDataSelector', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor SingleDataSelector
		 * @class ひとつのデータのみを選択できる {@link DataSelector} です。
		 * @extends DataSelector
		 */
		function SingleDataSelector() {
			this._selectedDataId = null;
		}

		var singleDataSelectorDefinition = {

			// --- Metadata --- //

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _SingleDataSelector
			 */
			__name: ctx.className,


			// --- Implement Method --- //

			select: function(dataId) {
				var validator = ctx.argsValidator('public');
				validator.arg('dataId', dataId, type.validateDataId);

				var old = this._selectedDataId;
				this._selectedDataId = dataId;

				return old !== dataId;
			},

			selectAll: function() {
				throw error.NotSupported.createError('SelectAll');
			},

			unselect: function(dataId) {
				var validator = ctx.argsValidator('public');
				validator.arg('dataId', dataId, type.validateDataId);

				if (dataId !== this._selectedDataId) {
					return false;
				}

				this._selectedDataId = null;
				return true;
			},

			unselectAll: function() {
				var old = this._selectedDataId;
				this._selectedDataId = null;

				return old != null;
			},

			isSelected: function(dataId) {
				var validator = ctx.argsValidator('public');
				validator.arg('dataId', dataId, type.validateDataId);

				return this._selectedDataId === dataId;
			},

			getSelectedAll: function() {
				return [this._selectedDataId];
			},

			getDataSelectResult: function() {
				return {
					isDefaultUnselected: true,
					invertedIds: [this._selectedDataId]
				};
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {Dataid}
			 */
			_selectedDataId: null
		};

		return {
			constructorFunction: SingleDataSelector,
			superConstructorFunction: DataSelector,
			definition: singleDataSelectorDefinition
		};
	});


	// ---- Multi Data Selector ---- //

	var MultiDataSelector = defineClass(NAMESPACE + '.MultiDataSelector', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor MultiDataSelector
		 * @class 複数のデータを選択できる {@link DataSelector} です。
		 * @extends DataSelector
		 */
		function MultiDataSelector() {
			this._isDefaultUnselected = true;
			this._inverseSet = {};
		}

		/** @lends MultiDataSelector# */
		var multiDataSelectorDefinition = {

			// --- Metadata --- //

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _MultiDataSelector
			 */
			__name: ctx.className,


			// --- Implement Method --- //

			select: function(dataId) {
				var validator = ctx.argsValidator('public');
				validator.arg('dataId', dataId, type.validateDataId);

				var isSelected = this.isSelected(dataId);

				if (this._isDefaultUnselected) {
					this._inverseSet[dataId] = true;
				} else {
					delete this._inverseSet[dataId];
				}

				return !isSelected;
			},

			selectAll: function() {
				var old = !this._isDefaultUnselected && $.isEmptyObject(this._inverseSet);

				this._isDefaultUnselected = false;
				this._inverseSet = {};

				return !old;
			},

			unselect: function(dataId) {
				var validator = ctx.argsValidator('public');
				validator.arg('dataId', dataId, type.validateDataId);

				var isSelected = this.isSelected(dataId);

				if (this._isDefaultUnselected) {
					delete this._inverseSet[dataId];
				} else {
					this._inverseSet[dataId] = true;
				}

				return isSelected;
			},

			unselectAll: function() {
				var old = this._isDefaultUnselected && $.isEmptyObject(this._inverseSet);

				this._isDefaultUnselected = true;
				this._inverseSet = {};

				return !old;
			},

			isSelected: function(dataId) {
				var validator = ctx.argsValidator('public');
				validator.arg('dataId', dataId, type.validateDataId);

				var isInverse = util.hasProperty(this._inverseSet, dataId);
				return this._isDefaultUnselected ? isInverse : !isInverse;
			},

			isSelectedAll: function() {
				return !this._isDefaultUnselected && $.isEmptyObject(this._inverseSet);
			},

			getSelectedAll: function(allDataIdArray) {
				var validator = ctx.argsValidator('public');

				validator.arg('allDataIdArray', allDataIdArray, function(v) {
					v.notNull();
					v.array();

					v.values(type.validateDataId);
				});


				var result = [];

				util.forEach(allDataIdArray, this.own(function(dataId) {
					if (this.isSelected(dataId)) {
						result.push(dataId);
					}
				}));

				return result;
			},

			getDataSelectResult: function() {
				return {
					isDefaultUnselected: this._isDefaultUnselected,
					invertedIds: util.map(this._inverseSet, function(value, dataId) {
						return dataId;
					})
				};
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {Object.<DataId, boolean>}
			 */
			_inverseSet: null,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isDefaultUnselected: true
		};

		return {
			constructorFunction: MultiDataSelector,
			superConstructorFunction: DataSelector,
			definition: multiDataSelectorDefinition
		};
	});

	//=============================
	// CellSelector
	//=============================

	var CellSelector = defineClass(NAMESPACE + '.CellSelector', function(ctx) {

		var log = ctx.log;

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor CellSelector
		 * @class セルのフォーカスとマークを管理するクラスです。
		 * @mixes EventDispatcher
		 * @mixes Disposable
		 */
		function CellSelector() {
			this._isSelecting = false;
			this._focusedCell = null;
			this._selectedRange = null;
		}

		/** @lends CellSelector# */
		var cellSelectorDefinition = {

			// --- Metadata --- //

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _CellSelector
			 */
			__name: ctx.className,


			// --- Public Event --- //

			/**
			 * マークが変更されたことを表すイベントです。
			 *
			 * @event CellSelector#changeCellSelect
			 * @type {ChangeCellSelectEvent}
			 */


			// --- Public Method --- //
			/**
			 * セルの選択操作中であるかを返します。
			 *
			 * @returns {boolean} 現在選択中であれば true、そうでなければ false
			 */
			isSelecting: function() {
				return this._isSelecting;
			},

			/**
			 * 選択操作を開始します。
			 *
			 * @fires CellSelector#changeCellSelect
			 * @param {Index} row
			 * @param {Index} column
			 */
			selectStart: function(row, column) {
				if (this._isSelecting) {
					var pattern = '既に選択を開始しているため selectStart は無視されました; row={0}, column={1}';
					log.warn(pattern, row, column);
					return;
				}

				this._isSelecting = true;

				var oldFocusedCell = this._focusedCell;
				var newFocusedCell = {
					row: row,
					column: column
				};

				var oldRange = this._selectedRange;
				var newRange = {
					rowIndex: row,
					rowLength: 1,
					columnIndex: column,
					columnLength: 1
				};

				var isSameFocus = util.deepEquals(oldFocusedCell, newFocusedCell);
				var isSameRange = util.deepEquals(oldRange, newRange);
				if (isSameFocus && isSameRange) {
					return;
				}

				this._focusedCell = newFocusedCell;
				this._selectedRange = newRange;
				this._dispatchChangeCellSelectEvent();
			},

			/**
			 * 選択操作中に移動します。
			 *
			 * @fires CellSelector#changeCellSelect
			 * @param {Index} row
			 * @param {Index} column
			 */
			selectMove: function(row, column) {
				if (!this._isSelecting) {
					var pattern = '選択を開始していないため selectMove は無視されました; row={0}, column={1}';
					log.warn(pattern, row, column);
					return;
				}

				var startRow = this._focusedCell.row;
				var startColumn = this._focusedCell.column;

				var oldRange = this._selectedRange;
				var newRange = {
					rowIndex: Math.min(startRow, row),
					rowLength: Math.abs(startRow - row) + 1,
					columnIndex: Math.min(startColumn, column),
					columnLength: Math.abs(startColumn - column) + 1
				};

				if (util.deepEquals(oldRange, newRange)) {
					return;
				}

				this._selectedRange = newRange;
				this._dispatchChangeCellSelectEvent();
			},

			/**
			 * 選択操作を終了します。
			 */
			selectEnd: function() {
				this._isSelecting = false;
			},

			/**
			 * 一括で範囲選択を行います。
			 *
			 * @param {Index} rowIndex
			 * @param {Length} rowLength
			 * @param {Index} columnIndex
			 * @param {Length} columnLength
			 */
			selectRange: function(rowIndex, rowLength, columnIndex, columnLength) {
				var oldRange = this._selectedRange;
				var newRange = {
					rowIndex: rowIndex,
					rowLength: rowLength,
					columnIndex: columnIndex,
					columnLength: columnLength
				};

				if (!util.deepEquals(oldRange, newRange)) {
					this._selectedRange = newRange;
					this._dispatchChangeCellSelectEvent();
				}

				this._isSelecting = false;
			},

			/**
			 * 特定のセルにフォーカスします。
			 *
			 * @fires CellSelector#changeCellSelect
			 * @param {Index} row
			 * @param {Index} column
			 */
			focus: function(row, column) {
				this._focusedCell = {
					row: row,
					column: column
				};

				this._selectedRange = {
					rowIndex: row,
					rowLength: 1,
					columnIndex: column,
					columnLength: 1
				};

				this._isSelecting = false;
				this._dispatchChangeCellSelectEvent();
			},

			/**
			 * マークとフォーカスを解除します。
			 *
			 * @fires CellSelector#changeCellSelect
			 */
			reset: function() {
				var hasChange = this._focusedCell != null || this._selectedRange != null;

				this._focusedCell = null;
				this._selectedRange = null;
				this._isSelecting = false;

				if (hasChange) {
					this._dispatchChangeCellSelectEvent();
				}
			},

			/**
			 * フォーカスしたセルを返します。
			 *
			 * @returns {?CellPosition} フォーカスしたセル
			 */
			getFocusedCell: function() {
				if (this._focuesedCell === null) {
					return null;
				}
				return $.extend({}, this._focusedCell);
			},

			/**
			 * 選択された範囲を返します。
			 *
			 * @returns {?CellRange} 選択した範囲
			 */
			getSelectedRange: function() {
				if (this._selectedRange === null) {
					return null;
				}
				return $.extend({}, this._selectedRange);
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {boolean}
			 */
			_isSelecting: null,

			/**
			 * @private
			 * @type {?CellPosition}
			 */
			_focusedCell: null,

			/**
			 * @private
			 * @type {?CellRange}
			 */
			_selectedRange: null,


			// --- Private Method --- //

			_dispatchChangeCellSelectEvent: function() {
				this.dispatchEvent({
					type: 'changeCellSelect',
					focusedCell: $.extend({}, this._focusedCell),
					selectedRange: $.extend({}, this._selectedRange)
				});
			}
		};

		return {
			constructorFunction: CellSelector,
			mixins: [h5.mixin.eventDispatcher, util.disposable],
			definition: cellSelectorDefinition
		};
	});


	//=============================
	// SizeHolder
	//=============================

	var SizeHolder = defineClass(NAMESPACE + '.SizeHolder', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor SizeHolder
		 * @class セルのサイズを管理するクラスです。
		 * @param {PixelSize} defaultSize デフォルトのサイズ
		 */
		function SizeHolder(defaultSize) {
			var validator = ctx.argsValidator('constructor');
			validator.arg('defaultSize', defaultSize, type.validatePixelSize);

			this._defaultSize = defaultSize;
			this._sizeMap = {};
		}

		/** @lends SizeHolder# */
		var sizeHolderDefinition = {

			// --- Metadata --- //

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _SizeHolder
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * 指定したキーに紐付けてサイズを保存します。
			 * <p>
			 * キーにはプロパティ名やデータのIDが入る想定です。
			 * </p>
			 *
			 * @param {SizeKey} key サイズを保存するキー
			 * @param {PixelSize} size サイズ
			 */
			setSize: function(key, size) {
				var validator = ctx.argsValidator('public');

				validator.arg('key', key, type.validateSizeKey);
				validator.arg('size', size, type.validatePixelSize);

				if (size === this._defaultSize) {
					delete this._sizeMap[key];
				} else {
					this._sizeMap[key] = size;
				}
			},

			/**
			 * 指定したキーのサイズを取得します。
			 *
			 * @param {SizeKey} key サイズが保存されているキー
			 */
			getSize: function(key) {
				var validator = ctx.argsValidator('public');

				validator.arg('key', key, type.validateSizeKey);

				if (util.hasProperty(this._sizeMap, key)) {
					return this._sizeMap[key];
				}
				return this._defaultSize;
			},

			/**
			 * 保存されているサイズをすべてリセットします。
			 */
			resetSize: function() {
				this._sizeMap = {};
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {PixelSize}
			 */
			_defaultSize: null,

			/**
			 * @private
			 * @type {Object.<SizeKey, PixelSize>}
			 */
			_sizeMap: null
		};

		return {
			constructorFunction: SizeHolder,
			definition: sizeHolderDefinition
		};
	});

	// TODO: 繰り返しはどういう形にすべきかあとで考える

	//=============================
	// OrderedSizeSet
	//=============================

	// MEMO: とりあえず固定とする

	var CellSizeSet = defineAbstractClass(NAMESPACE + '.CellSizeSet', function(ctx) {

		/**
		 * @constructor CellSizeSet
		 * @class 順番に並んだ各セルのサイズを管理し、計算するクラスです。
		 * @abstract
		 */
		function CellSizeSet() {}

		var abstractMethods = [

		/**
		 * セルの数を返します。
		 *
		 * @public
		 * @method
		 * @abstract
		 * @memberOf CellSizeSet#
		 * @returns {Length} セルの数
		 */
		'getCells',

		/**
		 * セルすべてをあわせたサイズを返します。
		 *
		 * @public
		 * @method
		 * @abstract
		 * @memberOf CellSizeSet#
		 * @returns {PixelSize} セルすべてをあわせたピクセル数
		 */
		'getTotalSize',

		/**
		 * セルのデフォルトのサイズを返します。
		 *
		 * @public
		 * @method
		 * @abstract
		 * @memberOf CellSizeSet#
		 * @returns {PixelSize} セルのデフォルトのサイズ
		 */
		'getDefaultCellSize',

		/**
		 * インデックスからピクセル単位の位置に変換します。
		 *
		 * @public
		 * @method
		 * @abstract
		 * @memberOf CellSizeSet# *
		 * @param {Index} index セルのインデックス
		 * @returns {PixelPosition} ピクセル単位のセルの開始位置
		 * @throws {IndexOutOfBounds} 指定したインデックスが範囲外の場合
		 */
		'toPositionFromIndex',

		/**
		 * @public
		 * @method
		 * @abstract
		 * @memberOf CellSizeSet#
		 * @param {PixelPosition} position ピクセル単位の位置
		 * @returns {?Index} 指定した位置を含むセルのインデックス（ない場合は null）
		 */
		'toIndexFromPosition',

		/**
		 * @public
		 * @method
		 * @abstract
		 * @memberOf CellSizeSet#
		 * @param {Index} index セルのインデックス
		 * @returns {PixelSize} 指定した位置を含むセルのサイズ
		 */
		'toSizeFromIndex',

		/**
		 * 表示領域に入るセルの数を計算します。
		 *
		 * @public
		 * @method
		 * @abstract
		 * @memberOf CellSizeSet#
		 * @param {PixelSize} displayAreaSize 表示領域のサイズ
		 * @param {Index} index 先頭のセルのインデックス
		 * @param {PixelPostion} position 表示位置
		 * @returns {Length} 表示範囲に入るセルの数
		 * @throws {IndexOutOfBounds} 指定したインデックスが範囲外の場合
		 */
		'calcDisplayCells',

		/**
		 * 最後の表示領域に入るセルの数を計算します。
		 *
		 * @public
		 * @method
		 * @abstract
		 * @memberOf CellSizeSet#
		 * @param {PixelSize} displayAreaSize 表示領域のサイズ
		 * @returns {Length} 表示領域に入るセルの数
		 */
		'calcLastDisplayCells'];

		/** @lends CellSizeSet# */
		var cellSizeDefinition = {

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _CellSizeSet
			 */
			__name: ctx.className
		};

		return {
			constructorFunction: CellSizeSet,
			abstractMethods: abstractMethods,
			definition: cellSizeDefinition
		};
	});

	var SingleValueCellSizeSet = defineClass(NAMESPACE + '.SingleValueCellSizeSet', function(ctx) {

		/**
		 * @constructor SingleValueCellSizeSet
		 * @class ひとつの値で固定された {@link CellSizeSet} です。
		 * @extends CellSizeSet
		 * @param {PixelSize} size
		 * @param {Length} cells
		 */
		function SingleValueCellSizeSet(size, cells) {
			var validator = ctx.argsValidator('constructor');
			validator.arg('size', size, type.validatePixelSize);
			validator.arg('cells', cells, type.validateLength);

			this._size = size;
			this._cells = cells;
		}

		/** @lends SingleValueCellSizeSet# */
		var singleValueCellSizeSetDefinition = {

			// --- Metadata --- //

			/**
			 * @private
			 * @memberOf _SingleValueCellSizeSet
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * セルのサイズをセットします。
			 *
			 * @param {PixelSize} size
			 */
			setSize: function(size) {
				var validator = ctx.argsValidator('public');
				validator.arg('size', size, type.validatePixelSize);

				this._size = size;
			},

			/**
			 * セルの数をセットします。
			 *
			 * @param {Length} cells
			 */
			setCells: function(cells) {
				var validator = ctx.argsValidator('public');
				validator.arg('cells', cells, type.validateLength);

				this._cells = cells;
			},


			// --- Implement Method --- //

			getCells: function() {
				return this._cells;
			},

			getTotalSize: function() {
				return this._cells * this._size;
			},

			getDefaultCellSize: function() {
				return this._size;
			},


			toPositionFromIndex: function(index) {
				var validator = ctx.argsValidator('public');
				validator.arg('index', index, type.validateIndex);

				// MEMO: header 分が cells を超えることがあるので cells 以下であるかはチェックしてはいけない

				return index * this._size;
			},

			toIndexFromPosition: function(position) {
				var validator = ctx.argsValidator('public');
				validator.arg('position', position, type.validatePixelPosition);

				var index = Math.floor(position / this._size);
				if (index < 0 || this._cells <= index) {
					return null;
				}
				return index;
			},

			toSizeFromIndex: function(index) {
				var validator = ctx.argsValidator('public');
				validator.arg('index', index, type.validateIndex);

				return this._size;
			},

			calcDisplayCells: function(displayAreaSize, index, position) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);
				validator.arg('index', index, type.validateIndex);
				validator.arg('position', position, type.validatePixelPosition);

				// MEMO: チェックで弾くとデータがないときに問題になったはず

				var displayCells = Math.ceil((displayAreaSize - position) / this._size);
				var endIndex = index + displayCells;
				return (this._cell < endIndex) ? this._cells - index : displayCells;
			},

			calcLastDisplayCells: function(displayAreaSize) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);

				var displayCells = Math.ceil(displayAreaSize / this._size);
				return (this._cells < displayCells) ? this._cells : displayCells;
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {PixelSize}
			 */
			_size: null,

			/**
			 * @private
			 * @type {Length}
			 */
			_cells: null
		};

		return {
			constructorFunction: SingleValueCellSizeSet,
			superConstructorFunction: CellSizeSet,
			definition: singleValueCellSizeSetDefinition
		};
	});


	var ArrayCellSizeSet = defineClass(NAMESPACE + '.ArrayCellSizeSet', function(ctx) {

		var log = ctx.log;

		/**
		 * @constructor ArrayCellSizeSet
		 * @class 配列ですべてのサイズが指定された {@link CellSizeSet} です。
		 * @extends CellSizeSet
		 * @param {Array.<PixelSize>} sizeArray
		 * @param {PixelSize} defaultCellSize
		 */
		function ArrayCellSizeSet(sizeArray, defaultCellSize) {
			this.setSizeArray(sizeArray);
			this._defaultCellSize = defaultCellSize;
		}

		/** @lends ArrayCellSizeSet# */
		var arrayCellSizeSetDefinition = {

			// --- Metadata --- //

			/**
			 * @private
			 * @memberOf _ArrayCellSizeSet
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * すべてのセルのサイズをセットします。
			 *
			 * @param {Array.<PixelSize>} sizeArray
			 */
			setSizeArray: function(sizeArray) {
				var validator = ctx.argsValidator('public');
				validator.arg('sizeArray', sizeArray, function(v) {
					v.notNull();
					v.array();
					v.values(type.validatePixelSize);
				});

				this._sizeArray = $.extend([], sizeArray);

				var positionArray = [];
				var position = 0;

				util.forEach(sizeArray, function(size) {
					positionArray.push(position);
					position += size;
				});

				this._positionArray = positionArray;
				this._endPosition = position;
			},


			// --- Implement Method --- //

			getCells: function() {
				return this._sizeArray.length;
			},

			getTotalSize: function() {
				return this._endPosition;
			},

			getDefaultCellSize: function() {
				return this._defaultCellSize;
			},

			toPositionFromIndex: function(index) {
				var validator = ctx.argsValidator('public');
				validator.arg('index', index, type.validateIndex);

				if (this._positionArray.length <= index) {
					throw error.IndexOutOfBounds.createError(index);
				}

				return this._positionArray[index];
			},

			toIndexFromPosition: function(position) {
				var validator = ctx.argsValidator('public');
				validator.arg('position', position, type.validatePixelPosition);

				if (position < 0 || this._endPosition < position) {
					return null;
				}

				// 次のインデックスを計算して、そのひとつ前を返す
				var result = util.binarySearch(this._positionArray, position, true, compareSize);
				return result.index - 1;
			},

			toSizeFromIndex: function(index) {
				var validator = ctx.argsValidator('public');
				validator.arg('index', index, type.validateIndex);

				if (this._sizeArray.length <= index) {
					throw error.IndexOutOfBounds.createError(index);
				}

				return this._sizeArray[index];
			},

			calcDisplayCells: function(displayAreaSize, index, position) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);
				validator.arg('index', index, type.validateIndex);
				validator.arg('position', position, type.validatePixelPosition);

				var len = this._sizeArray.length;

				if (len <= index) {
					throw error.IndexOutOfBounds.createError(index);
				}


				var i;
				var size = displayAreaSize - position;
				for (i = 0; i + index < len; i++) {
					if (size <= 0) {
						break;
					}
					size -= this._sizeArray[index + i];
				}

				return i;
			},

			calcLastDisplayCells: function(displayAreaSize) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);

				if (this._endPosition <= displayAreaSize) {
					return this._sizeArray.length;
				}

				var i;
				var len = this._sizeArray.length;
				var size = displayAreaSize;
				for (i = 1; 0 <= len - i; i++) {
					size -= this._sizeArray[len - i];
					if (size <= 0) {
						return i;
					}
				}

				log.warn('BUG!! プログラム上、ここを通過することはありえないはずです');
				return this._sizeArray.length;
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {Array.<PixelSize>}
			 */
			_sizeArray: null,

			/**
			 * @private
			 * @type {Array.<PixelPosition>}
			 */
			_positionArray: null,

			/**
			 * @private
			 * @type {PixelPosition}
			 */
			_endPosition: null
		};

		return {
			constructorFunction: ArrayCellSizeSet,
			superConstructorFunction: CellSizeSet,
			definition: arrayCellSizeSetDefinition
		};
	});


	// MEMO: 繰り返しがここに入る

	var ScrollAreaCellSizeSet = defineClass(NAMESPACE + '.ScrollAreaCellSizeSet', function(ctx) {

		/**
		 * @constructor ScrollAreaCellSizeSet
		 * @class スクロールエリア計算用にヘッダ分を抜いて計算する {@link CellSizeSet} です。
		 * @extends CellSizeSet
		 * @param {CellSizeSet} delegate
		 * @param {Length} headerCells
		 */
		function ScrollAreaCellSizeSet(delegate, headerCells) {
			this._delegate = delegate;
			this._headerCells = headerCells;
		}

		/** @lends ScrollAreaSizeSet# */
		var scrollAreaCellSizeSetDefinition = {

			// --- Metadata --- //

			/**
			 * @private
			 * @memberOf _ScrollAreaCellSizeSet
			 */
			__name: ctx.className,


			// --- Public Method --- //

			setHeaderCells: function(headerCells) {
				this._headerCells = headerCells;
			},


			// --- Implement Method --- //

			getCells: function() {
				return this._delegate.getCells() - this._headerCells;
			},

			getTotalSize: function() {
				return this._delegate.getTotalSize() - this._getHeaderSize();
			},

			getDefaultCellSize: function() {
				return this._delegate.getDefaultCellSize();
			},

			toPositionFromIndex: function(index) {
				var position = this._delegate.toPositionFromIndex(index + this._headerCells);
				var result = position - this._getHeaderSize();
				return (result < 0) ? 0 : result;
			},

			toIndexFromPosition: function(position) {
				var index = this._delegate.toIndexFromPosition(position + this._getHeaderSize());
				var result = index - this._headerCells;
				return (result < 0) ? 0 : result;
			},

			toSizeFromIndex: function(index) {
				return this._delegate.toSizeFromIndex(index + this._headerCells);
			},

			calcDisplayCells: function(displayAreaSize, index, position) {
				var _index = index + this._headerCells;
				return this._delegate.calcDisplayCells(displayAreaSize, _index, position);
			},

			calcLastDisplayCells: function(displayAreaSize) {
				var cells = this.getCells();
				var result = this._delegate.calcLastDisplayCells(displayAreaSize);
				return (cells < result) ? cells : result;
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {CellSizeSet}
			 */
			_delegate: null,

			/**
			 * @private
			 * @type {Length}
			 */
			_headerCells: null,


			// --- Private Method --- //

			_getHeaderSize: function() {
				return this._delegate.toPositionFromIndex(this._headerCells);
			}
		};

		return {
			constructorFunction: ScrollAreaCellSizeSet,
			superConstructorFunction: CellSizeSet,
			definition: scrollAreaCellSizeSetDefinition
		};
	});


	//=============================
	// ScrollCalculator
	//=============================

	var ScrollCalculator = defineAbstractClass(NAMESPACE + '.ScrollCalculator', function(ctx) {

		/**
		 * @constructor ScrollCalculator
		 * @class スクロール計算を行うクラスです。
		 * @abstract
		 */
		function ScrollCalculator() {}

		var abstractMethods = [];

		/** @lends ScrollCalculator# */
		var scrollCalculatorDefinition = {

			// --- Metadata --- //

			/**
			 * @private
			 * @memberOf _ScrollCalculator
			 */
			__name: ctx.className,


			// --- Protected Method --- //

			/**
			 * @protected
			 * @param {CellSizeSet} cellSizeSet
			 */
			init: function(cellSizeSet) {
				var validator = ctx.argsValidator('protected');
				validator.arg('cellSizeSet', cellSizeSet, function(v) {
					v.notNull();
					v.instanceOf(CellSizeSet);
				});

				this._cellSizeSet = cellSizeSet;
			},

			/**
			 * @protected
			 * @returns {CellSizeSet}
			 */
			getCellSizeSet: function() {
				return this._cellSizeSet;
			}
		};

		return {
			constructorFunction: ScrollCalculator,
			abstractMethods: abstractMethods,
			definition: scrollCalculatorDefinition
		};
	});


	var IndexScrollCalculator = defineClass(NAMESPACE + '.IndexScrollCalculator', function(ctx) {

		/**
		 * @constructor IndexScrollCalculator
		 * @class インデックスをベースにしてスクロール計算を行うクラスです。
		 * @extends ScrollCalculator
		 * @param {CellSizeSet} cellSizeSet セルのサイズを保持したオブジェクト
		 */
		function IndexScrollCalculator(cellSizeSet) {
			var validator = ctx.argsValidator('constructor');
			validator.arg('cellSizeSet', cellSizeSet, $.noop);

			this.init(cellSizeSet);
		}

		/** @lends IndexScrollCalculator# */
		var indexScrollCalculatorDefinition = {

			// --- Metadata --- //

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _IndexScrollCalculator
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * @param {PixelSize} displayAreaSize 表示領域のピクセル数
			 * @returns {ScrollPosition} スクロール終了位置
			 */
			getScrollEndPosition: function(displayAreaSize) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);

				var cellSizeSet = this.getCellSizeSet();

				// 全部表示できている場合は 1 を返す
				var totalSize = cellSizeSet.getTotalSize();
				if (totalSize <= displayAreaSize) {
					return 1;
				}

				var cells = cellSizeSet.getCells();

				// 最後の画面の下端で全部表示できているセル数
				var lastDisplayCells = cellSizeSet.calcLastDisplayCells(displayAreaSize + 1) - 1;
				return cells - lastDisplayCells + 1;
			},

			/**
			 * @param {PixelSize} displayAreaSize 表示領域のピクセル数
			 * @param {ScrollPosition} scrollPosition スクロール位置
			 * @returns {DisplayRange} 表示に必要な範囲
			 */
			calcDisplayRange: function(displayAreaSize, scrollPosition) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);
				validator.arg('scrollPosition', scrollPosition, type.validateScrollPosition);

				var cellSizeSet = this.getCellSizeSet();
				var cells = cellSizeSet.getCells();
				var endPosition = this.getScrollEndPosition(displayAreaSize);

				// 全部表示できる場合
				if (cellSizeSet.getTotalSize() <= displayAreaSize) {
					return {
						index: 0,
						length: cells,
						displayPosition: 0
					};
				}

				// 最後の場合
				if (endPosition <= scrollPosition + 1) {
					var lastDisplayCells = cellSizeSet.calcLastDisplayCells(displayAreaSize);
					return {
						index: cells - lastDisplayCells,
						length: lastDisplayCells,
						displayPosition: 'last'
					};
				}

				// 通常は scrollPosition はインデックスと同じ
				var index = scrollPosition;
				var length = cellSizeSet.calcDisplayCells(displayAreaSize, index, 0);

				return {
					index: index,
					length: length,
					displayPosition: 0
				};
			},

			/**
			 * 次の要素にスクロールする際のスクロール位置を返します。
			 *
			 * @param {PixelSize} displayAreaSize 表示領域のサイズ
			 * @param {ScrollPosition} position 現在のスクロール位置
			 * @returns {ScrollPosition} 次の要素のスクロール位置
			 */
			calcNextPosition: function(displayAreaSize, position) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);
				validator.arg('position', position, type.validateScrollPosition);

				var nextPosition = position + 1;
				var endPosition = this.getScrollEndPosition(displayAreaSize);

				return (endPosition <= nextPosition) ? endPosition - 1 : nextPosition;
			},

			/**
			 * 前の要素にスクロールする際のスクロール位置を返します。
			 *
			 * @param {PixelSize} displayAreaSize 表示領域のサイズ
			 * @param {ScrollPosition} position 現在のスクロール位置
			 * @returns {ScrollPosition} 前の要素のスクロール位置
			 */
			calcPrevPosition: function(displayAreaSize, position) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);
				validator.arg('position', position, type.validateScrollPosition);

				var prevPosition = position - 1;
				return (prevPosition < 0) ? 0 : prevPosition;
			},

			calcDisplaySize: function(displayAreaSize) {
				var defaultCellSize = this.getCellSizeSet().getDefaultCellSize();
				return Math.ceil(displayAreaSize / defaultCellSize);
			}
		};

		return {
			constructorFunction: IndexScrollCalculator,
			superConstructorFunction: ScrollCalculator,
			definition: indexScrollCalculatorDefinition
		};
	});


	var PixelScrollCalculator = defineClass(NAMESPACE + '.PixelScrollCalculator', function(ctx) {

		/**
		 * @constructor PixelScrollCalculator
		 * @class インデックスをベースにしてスクロール計算を行うクラスです。
		 * @extends ScrollCalculator
		 * @param {CellSizeSet} cellSizeSet
		 */
		function PixelScrollCalculator(cellSizeSet) {
			this.init(cellSizeSet);
		}

		/** @lends PixelScrollCalculator# */
		var pixelScrollCalculatorDefinition = {

			// --- Metadata --- //

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _PixelScrollCalculator
			 */
			__name: ctx.className,


			// --- Public Method --- //

			getScrollEndPosition: function(displayAreaSize) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);

				var cellSizeSet = this.getCellSizeSet();
				var totalSize = cellSizeSet.getTotalSize();
				if (totalSize <= displayAreaSize) {
					return 1;
				}

				return totalSize - displayAreaSize + 1;
			},

			getScale: function() {
				return 1;
			},

			/**
			 * @param {PixelSize} displayAreaSize 表示領域のピクセル数
			 * @param {ScrollPosition} position スクロール位置
			 * @returns {DisplayRange} 表示に必要な範囲
			 */
			calcDisplayRange: function(displayAreaSize, position) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);
				validator.arg('position', position, type.validateScrollPosition);

				var cellSizeSet = this.getCellSizeSet();

				var cells = cellSizeSet.getCells();
				var endPosition = this.getScrollEndPosition(displayAreaSize);

				// 全部表示できる場合
				if (cellSizeSet.getTotalSize() <= displayAreaSize) {
					return {
						index: 0,
						length: cells,
						displayPosition: 0
					};
				}
				if (endPosition <= position + 1) {
					var lastDisplayCells = cellSizeSet.calcLastDisplayCells(displayAreaSize);
					return {
						index: cells - lastDisplayCells,
						length: lastDisplayCells,
						displayPosition: 'last'
					};
				}

				var index = cellSizeSet.toIndexFromPosition(position);
				var cellPosition = cellSizeSet.toPositionFromIndex(index);
				var displayPosition = cellPosition - position;
				var length = cellSizeSet.calcDisplayCells(displayAreaSize, index, displayPosition);

				return {
					index: index,
					length: length,
					displayPosition: displayPosition
				};
			},

			/**
			 * 次の要素にスクロールする際のスクロール位置を返します。
			 *
			 * @param {PixelSize} displayAreaSize 表示領域のピクセル数
			 * @param {ScrollPosition} position 現在のスクロール位置
			 * @returns {ScrollPosition} 次の要素のスクロール位置
			 */
			calcNextPosition: function(displayAreaSize, position) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);
				validator.arg('position', position, type.validateScrollPosition);

				var endPosition = this.getScrollEndPosition(displayAreaSize);
				if (endPosition <= position + 1) {
					return endPosition - 1;
				}

				var cellSizeSet = this.getCellSizeSet();
				var cells = cellSizeSet.getCells();
				var index = cellSizeSet.toIndexFromPosition(position);

				// 最後のセルの場合はラストを返す
				if (cells <= index + 1) {
					return endPosition - 1;
				}

				// 次のインデックスのポジションを返す
				var nextPosition = cellSizeSet.toPositionFromIndex(index + 1);
				return (endPosition <= nextPosition) ? endPosition - 1 : nextPosition;
			},

			/**
			 * 前の要素にスクロールする際のスクロール位置を返します。
			 *
			 * @param {PixelSize} displayAreaSize 表示領域のピクセル数
			 * @param {ScrollPosition} position 現在のスクロール位置
			 * @returns {ScrollPosition} 前の要素のスクロール位置
			 */
			calcPrevPosition: function(displayAreaSize, position) {
				var validator = ctx.argsValidator('public');
				validator.arg('displayAreaSize', displayAreaSize, type.validatePixelSize);
				validator.arg('position', position, type.validateScrollPosition);

				var _position = position;
				var endPosition = this.getScrollEndPosition(displayAreaSize);
				if (endPosition <= position + 1) {
					_position = endPosition - 1;
				}

				var cellSizeSet = this.getCellSizeSet();
				var index = cellSizeSet.toIndexFromPosition(_position);
				var cellPosition = cellSizeSet.toPositionFromIndex(index);

				// セルの途中の場合、セルの先頭にジャンプ
				if (cellPosition < _position) {
					return cellPosition;
				}

				// セルの先頭にピッタリ合う場合はひとつ前にジャンプ
				var prevIndex = index - 1;
				if (prevIndex < 0) {
					prevIndex = 0;
				}
				var prevPosition = cellSizeSet.toPositionFromIndex(prevIndex);

				return prevPosition;
			},

			calcDisplaySize: function(displayAreaSize) {
				return displayAreaSize;
			}
		};

		return {
			constructorFunction: PixelScrollCalculator,
			superConstructorFunction: ScrollCalculator,
			definition: pixelScrollCalculatorDefinition
		};

	});


	//=============================
	// GridRange
	//=============================

	/**
	 * @typedef {Object} GridRangeParam
	 * @property {Index} rowStartIndex
	 * @property {Index} columnStartIndex
	 * @property {PixelPosition} top
	 * @property {PixelPosition} left
	 * @property {Array.<Array.<GridCell>>} cells
	 * @property {CellSizeSet} rowHeightSet
	 * @property {CellSizeSet} columnWidthSet
	 * @property {Array.<Array.<GridBorder>>} verticalBorders
	 * @property {Array.<Array.<GridBroder>>} horizontalBorders
	 * @property {Object.<PropertyName, OrderString>} sortOrder
	 */

	function validateGridRangeParam(v) {
		v.check('GridRangeParam', function(v) {
			v.notNull();
			v.plainObject();

			v.property('rowStartIndex', type.validateIndex);
			v.property('columnStartIndex', type.validateIndex);
			v.property('top', type.validatePixelPosition);
			v.property('left', type.validatePixelPosition);
			v.property('cells', function(v) {
				v.notNull();
				v.array();

				v.values(function(v) {
					v.notNull();
					v.array();

					v.values(type.validateGridCell);
				});
			});

			v.property('rowHeightSet', function(v) {
				v.notNull();
				v.instanceOf(CellSizeSet);
			});
			v.property('columnWidthSet', function(v) {
				v.notNull();
				v.instanceOf(CellSizeSet);
			});

			v.property('verticalBorders', function(v) {
				v.notNull();
				v.array();

				v.values(function(v) {
					v.notNull();
					v.array();

					v.values(type.validateGridBorder);
				});
			});
			v.property('horizontalBorders', function(v) {
				v.notNull();
				v.array();

				v.values(function(v) {
					v.notNull();
					v.array();

					v.values(type.validateGridBorder);
				});
			});

			v.property('sortOrder', function(v) {
				v.notNull();
				v.plainObject();

				v.keys(type.validatePropertyName);
				v.values(type.validateOrderString);
			});
		});
	}

	var GridRange = util.defineClass(NAMESPACE + '.GridRange', function(ctx) {

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor GridRange
		 * @class 範囲を表現するクラス
		 * @param {GridRangeParam} param
		 */
		function GridRange(param) {
			var validator = ctx.argsValidator('constructor');
			validator.arg('param', param, validateGridRangeParam);

			this._rowStartIndex = param.rowStartIndex;
			this._columnStartIndex = param.columnStartIndex;
			this._top = param.top;
			this._left = param.left;
			this._cells = param.cells;
			this._rowHeightSet = param.rowHeightSet;
			this._columnWidthSet = param.columnWidthSet;
			this._verticalBorders = param.verticalBorders;
			this._horizontalBorders = param.horizontalBorders;
			this._sortOrder = param.sortOrder;
		}


		/** @lends GridRange# */
		var gridRangeDefinition = {

			// --- Metadata --- //

			/**
			 * @memberOf _GridRange
			 * @private
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * この範囲の開始地点の行番号を返します。
			 *
			 * @returns {Index} 開始地点の行番号
			 */
			getRowStartIndex: function() {
				return this._rowStartIndex;
			},

			/**
			 * この範囲に含まれる行数を返します。
			 *
			 * @returns {Length} 範囲に含まれる行数
			 */
			getRowLength: function() {
				return this._cells.length;
			},

			getAllRows: function() {
				return this._rowHeightSet.getCells();
			},

			/**
			 * この範囲の開始地点の列番号を返します。
			 *
			 * @returns {Index} 開始地点の列番号
			 */
			getColumnStartIndex: function() {
				return this._columnStartIndex;
			},

			/**
			 * この範囲に含まれる列数を返します。
			 *
			 * @returns {Length} 範囲に含まれる列数
			 */
			getColumnLength: function() {
				if (this._cells.length === 0) {
					return 0;
				}
				return this._cells[0].length;
			},

			getAllColumns: function() {
				return this._columnWidthSet.getCells();
			},

			/**
			 * 返した範囲がもとの要求からどれぐらい縦にずれているかを返します。
			 *
			 * @returns {PixelPosition} ずれているピクセル数（予定より上から開始だと負）
			 */
			getTop: function() {
				return this._top;
			},

			/**
			 * 返した範囲がもとの要求からどれぐらい横にずれているかを返します。
			 *
			 * @returns {PixelPosition} ずれているピクセル数（予定より左から開始だと負）
			 */
			getLeft: function() {
				return this._left;
			},

			/**
			 * セルを取得します。
			 *
			 * @param {Index} i 範囲内の何行目か
			 * @param {Index} j 範囲内の何列目か
			 * @returns {GridCell} セル
			 */
			getCell: function(i, j) {
				var validator = ctx.argsValidator('public');

				validator.arg('i', i, type.validateIndex);
				validator.arg('j', j, type.validateIndex);

				return this._cells[i][j];
			},

			/**
			 * すべてのセルがロード済みであるかを返します。
			 *
			 * @returns {boolean} すべてのセルがロード済みであれば true、そうでなければ false
			 */
			isAllLoaded: function() {
				// MEMO: 重複を排除するようにした方が良いかも
				var rLen = this.getRowLength();
				var cLen = this.getColumnLength();

				for (var i = 0; i < rLen; i++) {
					for (var j = 0; j < cLen; j++) {
						var cell = this.getCell(i, j);
						if (!cell.isLoaded) {
							return false;
						}
					}
				}

				return true;
			},

			/**
			 * 行の高さを取得します。
			 *
			 * @param {Index} i 範囲内の何行目か（整数）
			 * @returns {PixelSize} 行の高さ（整数）
			 */
			getRowHeight: function(i) {
				var validator = ctx.argsValidator('public');
				validator.arg('i', i, type.validateIndex);

				var row = this._rowStartIndex + i;
				return this._rowHeightSet.toSizeFromIndex(row);
			},

			/**
			 * 列の幅を取得します。
			 *
			 * @param {Index} j 範囲内の何列目か
			 * @returns {PixelSize} 列の高さ
			 */
			getColumnWidth: function(j) {
				var validator = ctx.argsValidator('public');
				validator.arg('j', j, type.validateIndex);

				var column = this._columnStartIndex + j;
				return this._columnWidthSet.toSizeFromIndex(column);
			},

			/**
			 * 範囲全体の高さを取得します。
			 *
			 * @returns {PixelSize} 範囲全体の高さ
			 */
			getRangeHeight: function() {
				var height = 0;

				for (var i = 0, len = this.getRowLength(); i < len; i++) {
					height += this.getRowHeight(i);
				}

				return height;
			},

			/**
			 * 範囲全体の幅を取得します。
			 *
			 * @returns {PixelSize} 範囲全体の幅
			 */
			getRangeWidth: function() {
				var width = 0;

				for (var j = 0, len = this.getColumnLength(); j < len; j++) {
					width += this.getColumnWidth(j);
				}

				return width;
			},

			/**
			 * この範囲のコピー用のテキストを取得します。
			 *
			 * @returns {string} コピー用テキスト（TSV形式）
			 */
			getCopyText: function() {
				/* jshint loopfunc: true */
				var rLen = this.getRowLength();
				var cLen = this.getColumnLength();

				var str = '';

				for (var i = 0; i < rLen; i++) {
					var row = [];
					var isLoaded = false;

					// TODO: horizontal の場合は isLoaded でない行をはずすようにする?
					for (var j = 0; j < cLen; j++) {
						var cell = this.getCell(i, j);
						isLoaded = isLoaded || cell.isLoaded;

						// TODO: horizontal の場合は縦横を逆にやって最後に転置が必要
						util.forEach(cell.copyValues, function(copyValue) {
							row.push(copyValue);
						});
					}

					if (isLoaded) {
						str += row.join('\t');
						str += '\n';
					}
				}

				return str;
			},

			/**
			 * 指定したセルの上の罫線を取得します。
			 *
			 * @param {Index} i 範囲内の何行目か（整数）
			 * @param {Index} j 範囲内の何列目か（整数）
			 * @returns {GridBorder} 罫線情報
			 */
			getTopBorder: function(i, j) {
				var validator = ctx.argsValidator('public');

				validator.arg('i', i, type.validateIndex);
				validator.arg('j', j, type.validateIndex);

				return this._horizontalBorders[i][j];
			},

			/**
			 * 指定したセルの下の罫線を取得します。
			 *
			 * @param {Index} i 範囲内の何行目か（整数）
			 * @param {Index} j 範囲内の何列目か（整数）
			 * @returns {GridBorder} 罫線情報
			 */
			getBottomBorder: function(i, j) {
				var validator = ctx.argsValidator('public');

				validator.arg('i', i, type.validateIndex);
				validator.arg('j', j, type.validateIndex);

				return this._horizontalBorders[i + 1][j];
			},

			/**
			 * 指定したセルの左の罫線を取得します。
			 *
			 * @param {Index} i 範囲内の何行目か（整数）
			 * @param {Index} j 範囲内の何列目か（整数）
			 * @returns {GridBorder} 罫線情報
			 */
			getLeftBorder: function(i, j) {
				var validator = ctx.argsValidator('public');

				validator.arg('i', i, type.validateIndex);
				validator.arg('j', j, type.validateIndex);

				return this._verticalBorders[i][j];
			},

			/**
			 * 指定したセルの右の罫線を取得します。
			 *
			 * @param {Index} i 範囲内の何行目か（整数）
			 * @param {Index} j 範囲内の何列目か（整数）
			 * @returns {GridBorder} 罫線情報
			 */
			getRightBorder: function(i, j) {
				var validator = ctx.argsValidator('public');

				validator.arg('i', i, type.validateIndex);
				validator.arg('j', j, type.validateIndex);

				return this._verticalBorders[i][j + 1];
			},

			/**
			 * 指定したプロパティのソートの並び順を返します。
			 *
			 * @param {PropertyName} propertyName プロパティ名
			 * @returns {?OrderString} 並び順
			 */
			getSortOrder: function(propertyName) {
				var validator = ctx.argsValidator('public');
				validator.arg('propertyName', propertyName, type.validatePropertyName);

				if (!util.hasProperty(this._sortOrder, propertyName)) {
					return null;
				}
				return this._sortOrder[propertyName];
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {Length}
			 */
			_rowStartIndex: null,

			/**
			 * @private
			 * @type {Length}
			 */
			_columnStartIndex: null,

			/**
			 * @private
			 * @type {Array.<Array.<GridCell>>}
			 */
			_cells: null,

			/**
			 * @private
			 * @type {CellSizeSet}
			 */
			_rowHeightSet: null,

			/**
			 * @private
			 * @type {CellSizeSet}
			 */
			_columnWidthSet: null,

			/**
			 * @private
			 * @type {Array.<Array.<GridBorder>>}
			 */
			_verticalBorders: null,

			/**
			 * @private
			 * @type {Array.<Array.<GridBorder>>}
			 */
			_horizontalBorders: null,

			/**
			 * @private
			 * @type {Object.<PropertyName, OrderString>}
			 */
			_sortOrder: null

		};

		return {
			constructorFunction: GridRange,
			definition: gridRangeDefinition
		};
	});

	//=============================
	// GridRequest
	//=============================

	// 複数の Range と fetch, isAllDataLoaded を持つ
	/**
	 * @typedef {Object.<GridRegionName, GridRange>} GridRangeSet
	 */

	function validateGridRangeSet(v) {
		v.check('GridRangeSet', function(v) {
			v.notNull();
			v.plainObject();

			v.keys(type.validateGridRegionName);

			v.values(function(v) {
				v.notNull();
				v.instanceOf(GridRange);
			});
		});
	}

	var GridRequest = defineClass(NAMESPACE + '.GridRequest', function(ctx) {

		/**
		 * @constructor GridRequest
		 * @class グリッドに対する問い合わせを表現するクラスです。
		 */
		function GridRequest(rangeSet, isAllDataLoaded, fetchFunction) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('rangeSet', rangeSet, validateGridRangeSet);
			validator.arg('isAllDataLoaded', isAllDataLoaded, function(v) {
				v.notNull();
				v.type('boolean');
			});
			validator.arg('fetchFunction', fetchFunction, function(v) {
				v.notNull();
				v.func();
			});

			this._rangeSet = rangeSet;
			this._isAllDataLoaded = isAllDataLoaded;
			this._fetchFunction = fetchFunction;
		}

		/** @lends GridRequest# */
		var gridRequestDefinition = {

			// --- Metadata --- //

			/**
			 * @private
			 * @memberOf _GridRequest
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * 現時点での {@link GridRange} の集合を返します。
			 *
			 * @returns {GridRangeSet} リクエストに対応する {@link GridRange} の集合
			 */
			getRangeSet: function() {
				return this._rangeSet;
			},

			/**
			 * 現時点でリクエストされた範囲のデータがすべてロードされているかを返します。
			 *
			 * @returns {boolean} すべてのデータがロードされていれば true、そうでなければ false
			 */
			isAllDataLoaded: function() {
				return this._isAllDataLoaded;
			},

			/**
			 * リクエストされた範囲のデータのうち未ロードのものを取得します。
			 *
			 * @returns {AbortablePromise.<GridRangeSet>} すべてのデータがロードされた {@link GridRange} の集合
			 */
			fetchRangeSet: function() {
				return this._fetchFunction();
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {GridRangeSet}
			 */
			_rangeSet: null,

			/**
			 * @private
			 * @type {boolean}
			 */
			_isAllDataLoaded: null,

			/**
			 * @private
			 * @type {function(): AbortablePromise.<GridRangeSet>}
			 */
			_fetchFunction: null
		};

		return {
			constructorFunction: GridRequest,
			definition: gridRequestDefinition
		};
	});


	//=============================
	// GridPropertyHierarchy
	//=============================

	var GridPropertyHierarchy = defineClass(NAMESPACE + '.GridPropertyHierarchy', function(ctx) {

		/**
		 * @constructor GridPropertyHierarchy
		 * @class プロパティの階層構造を表現するクラスです。
		 * @param {PropertyHierarchy} hierarchy
		 */
		function GridPropertyHierarchy(hierarchy) {
			var validator = ctx.argsValidator('constructor');
			validator.arg('hierarchy', hierarchy, type.validatePropertyHierarchy);

			this._properties = {};
			this._maxDepth = 0;

			this._init(hierarchy);
		}


		/** @lends GridPropertyHierarchy# */
		var gridPropertyHierarchyDefinition = {

			// --- Metadata --- //

			/**
			 * @private
			 * @memberOf _GridPropertyHierarchy
			 */
			__name: ctx.className,


			// --- Public Method --- //

			/**
			 * 階層の最大の深さを返します。
			 *
			 * @returns {Length}
			 */
			getMaxDepth: function() {
				return this._maxDepth;
			},

			/**
			 * 指定したプロパティについて挿入可能なインデックスの一覧を返します。
			 *
			 * @param {PropertyName} propertyName
			 * @returns {Array.<Index>}
			 */
			getInsertableIndex: function(propertyName) {
				var validator = ctx.argsValidator('public');
				validator.arg('propertyName', propertyName, type.validatePropertyName);

				if (!util.hasProperty(this._properties, propertyName)) {
					throw error.NotFoundProperty.createError(propertyName);
				}

				// 完全に空の場合は先に抜ける
				if (this._properties['/'].visibleChildren.length === 0) {
					return [0];
				}

				var parentProperty = this._properties[propertyName].parent;
				var sameLevelProperties = this._properties[parentProperty].visibleChildren;

				// ひとつもない場合はひとつ上の階層を見る
				while (sameLevelProperties.length === 0) {
					parentProperty = this._properties[parentProperty].parent;
					sameLevelProperties = this._properties[parentProperty].visibleChildren;
				}

				var startProperty = sameLevelProperties[0];
				var startIndex = this._calcIndex(startProperty);

				var result = [startIndex];
				var index = startIndex;

				for (var i = 0, len = sameLevelProperties.length; i < len; i++) {
					var property = sameLevelProperties[i];
					if (property === propertyName) {
						continue;
					}

					var length = this._calcLength(property);
					index += length;
					result.push(index);
				}

				return result;
			},

			// TODO: サイズかLeaf取得をキャッシュする

			/**
			 * 末端のプロパティを順序通りに並べて返します。
			 *
			 * @returns {Array.<PropertyName>}
			 */
			getLeafProperties: function() {
				return this._expandLeaves('/');
			},

			/**
			 * ヘッダのセル構造を返します。
			 * <p>
			 * 2次元配列となっており、プロパティが増えると縦に増えていく構造となっています。<br>
			 * 縦にデータが並ぶ場合は転置して利用してください。
			 * </p>
			 *
			 * @returns {Array.<Array.<PropertyHeaderCell>>}
			 */
			getHeaderStructure: function() {
				var result = [];
				var properties = this._properties['/'].visibleChildren;

				util.forEach(properties, this.own(function(property) {
					$.merge(result, this._calcStructure(property));
				}));

				return result;
			},

			/**
			 * 指定したプロパティのルートプロパティが表示されているかを返します。
			 *
			 * @param {PropertyName} propertyName
			 * @returns {boolean} 指定したプロパティのルートが含まれていれば true、そうでなければ false
			 */
			isVisibleRoot: function(propertyName) {
				var validator = ctx.argsValidator('public');
				validator.arg('propertyName', propertyName, type.validatePropertyName);

				if (!util.hasProperty(this._properties, propertyName)) {
					return false;
				}

				var property = this._properties[propertyName];
				while (property.parent !== '/') {
					property = this._properties[property.parent];
				}

				var rootProperties = this._properties['/'].visibleChildren;
				return $.inArray(property.name, rootProperties) !== -1;
			},

			/**
			 * 指定したプロパティが末端のプロパティであるか返します。
			 *
			 * @param {PropertyName} propertyName
			 * @returns {boolean} 末端のプロパティであれば true、そうでなければ false
			 */
			isLeafProperty: function(propertyName) {
				var validator = ctx.argsValidator('public');
				validator.arg('propertyName', propertyName, type.validatePropertyName);

				if (!util.hasProperty(this._properties, propertyName)) {
					return false;
				}

				return this._properties[propertyName].isLeaf;
			},

			/**
			 * プロパティを追加します。
			 *
			 * @param {PropertyName} propertyName
			 * @param {Index} insertIndex
			 * @throws {NotFoundProperty}
			 * @throws {DuplicateProperty}
			 * @throws {IllegalIndex}
			 */
			addProperty: function(propertyName, insertIndex) {
				var validator = ctx.argsValidator('public');

				validator.arg('propertyName', propertyName, type.validatePropertyName);
				validator.arg('insertIndex', insertIndex, type.validateIndex);

				if (!util.hasProperty(this._properties, propertyName)) {
					throw error.NotFoundProperty.createError(propertyName);
				}

				var property = this._properties[propertyName];
				if (!property.isLeaf) {
					throw error.NotFoundProperty.createError(propertyName);
				}

				var parent = this._properties[property.parent];
				if ($.inArray(propertyName, parent.visibleChildren) !== -1) {
					throw error.DuplicateProperty.createError(propertyName);
				}

				while (parent.visibleChildren.length === 0 && parent.name !== '/') {
					parent.visibleChildren.push(property.name);
					property = parent;
					parent = this._properties[parent.parent];
				}

				var index = this._calcIndex(parent.name);
				var properties = parent.visibleChildren;
				for (var i = 0, len = properties.length; i <= len; i++) {
					if (index === insertIndex) {
						properties.splice(i, 0, property.name);
						return;
					}
					if (insertIndex < index) {
						break;
					}
					index += this._calcLength(properties[i]);
				}

				throw error.IllegalIndex.createError(insertIndex);
			},

			/**
			 * プロパティを移動します。
			 *
			 * @param {PropertyName} propertyName
			 * @param {Index} insertIndex
			 * @throws {NotFoundProperty}
			 * @throws {IllegalIndex}
			 */
			moveProperty: function(propertyName, insertIndex) {
				var validator = ctx.argsValidator('public');

				validator.arg('propertyName', propertyName, type.validatePropertyName);
				validator.arg('insertIndex', insertIndex, type.validateIndex);

				var property = this._properties[propertyName];

				var parent = this._properties[property.parent];
				var properties = parent.visibleChildren;

				var pos = $.inArray(propertyName, properties);
				if (pos === -1) {
					throw error.NotFoundProperty.createError(propertyName);
				}

				// 元の位置から削除
				properties.splice(pos, 1);

				var index = this._calcIndex(parent.name);
				for (var i = 0, len = properties.length; i <= len; i++) {
					if (index === insertIndex) {
						properties.splice(i, 0, propertyName);
						return;
					}
					if (insertIndex < index) {
						break;
					}
					index += this._calcLength(properties[i]);
				}

				throw error.IllegalIndex.createError(insertIndex);
			},

			/**
			 * プロパティを削除します。
			 *
			 * @param {PropertyName} propertyName
			 * @throws {NotFoundProperty}
			 */
			removeProperty: function(propertyName) {
				var validator = ctx.argsValidator('public');
				validator.arg('propertyName', propertyName, type.validatePropertyName);

				var property = this._properties[propertyName];
				if (!property.isLeaf) {
					throw error.NotFoundProperty.createError(propertyName);
				}

				var parent = this._properties[property.parent];
				var properties = parent.visibleChildren;

				var pos = $.inArray(propertyName, properties);
				if (pos === -1) {
					throw error.NotFoundProperty.createError(propertyName);
				}

				// 元の位置から削除
				properties.splice(pos, 1);

				// 親が空になったら、その親からも削除
				while (properties.length === 0 && parent.name !== '/') {
					property = parent;
					parent = this._properties[parent.parent];
					properties = parent.visibleChildren;
					pos = $.inArray(property.name, properties);
					properties.splice(pos, 1);
				}
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {Object.<string, Object>}
			 */
			_properties: null,

			/**
			 * @private
			 * @type {Length}
			 */
			_maxDepth: null,


			// --- Private Method --- //

			_init: function(hierarchy) {
				this._registerProperty({
					'/': hierarchy
				}, null, 0);
			},

			_registerProperty: function(hierarchy, parentName, depth) {
				if (this._maxDepth < depth) {
					this._maxDepth = depth;
				}

				util.forEach(hierarchy, this.own(function(children, propertyName) {
					if (util.hasProperty(this._properties, propertyName)) {
						throw new Error('propertyHierarchy に循環があります');
					}

					var isLeaf = children === null;

					this._properties[propertyName] = {
						name: propertyName,
						parent: parentName,
						depth: depth,
						children: children,
						isLeaf: isLeaf,
						visibleChildren: []
					};

					if (!isLeaf) {
						this._registerProperty(children, propertyName, depth + 1);
					}
				}));
			},

			_calcLength: function(propertyName) {
				var property = this._properties[propertyName];
				if (property.isLeaf) {
					return 1;
				}

				var length = 0;

				util.forEach(property.visibleChildren, this.own(function(child) {
					length += this._calcLength(child);
				}));

				return length;
			},

			_calcIndex: function(propertyName) {
				if (propertyName === '/') {
					return 0;
				}
				var property = this._properties[propertyName];
				var index = 0;

				while (property.name !== '/') {
					index += this._calcIndexInParent(property.name);
					property = this._properties[property.parent];
				}

				return index;
			},

			_calcIndexInParent: function(propertyName) {
				var parent = this._properties[propertyName].parent;
				var sameLevelProperties = this._properties[parent].visibleChildren;

				var index = 0;
				for (var i = 0, len = sameLevelProperties.length; i < len; i++) {
					var property = sameLevelProperties[i];
					if (property === propertyName) {
						return index;
					}
					index += this._calcLength(property);
				}

				throw new Error('Not Found: ' + propertyName);
			},

			_expandLeaves: function(propertyName) {
				var property = this._properties[propertyName];
				if (property.isLeaf) {
					return [propertyName];
				}

				var result = [];

				util.forEach(property.visibleChildren, this.own(function(child) {
					$.merge(result, this._expandLeaves(child));
				}));

				return result;
			},

			_calcStructure: function(propertyName) {
				/* jshint loopfunc: true */

				var property = this._properties[propertyName];
				var result = [[]];
				var i, propertyCell;

				if (property.isLeaf) {
					var dataSpan = this._maxDepth - property.depth + 1;
					propertyCell = {
						isBaseCell: true,
						dataSpan: dataSpan,
						propertySpan: 1,
						property: propertyName
					};

					result[0].push(propertyCell);
					for (i = 1; i < dataSpan; i++) {
						result[0].push({
							isBaseCell: false,
							dataOffset: i,
							propertyOffset: 0
						});
					}

					return result;
				}

				var length = this._calcLength(propertyName);
				var children = property.visibleChildren;
				propertyCell = {
					isBaseCell: true,
					dataSpan: 1,
					propertySpan: length,
					property: propertyName
				};

				result[0].push(propertyCell);

				for (i = 1; i < length; i++) {
					result.push([{
						isBaseCell: false,
						dataOffset: 0,
						propertyOffset: i
					}]);
				}

				var index = 0;
				var len = children.length;
				for (i = 0; i < len; i++) {
					var child = children[i];
					var childStructure = this._calcStructure(child);

					util.forEach(childStructure, function(row, j) {
						$.merge(result[index + j], row);
					});

					index += childStructure.length;
				}

				return result;
			}
		};

		return {
			constructorFunction: GridPropertyHierarchy,
			mixins: [util.ownSupport],
			definition: gridPropertyHierarchyDefinition
		};
	});

	//=============================
	// GridDataMapper
	//=============================

	// ---- GridDataMapper Base ---- //

	var GridDataMapper = defineAbstractClass(NAMESPACE + '.GridDataMapper', function(ctx) {

		/**
		 * @constructor GridDataMapper
		 * @class 元データからグリッドで表示する各セルのデータ形式に変換するクラスです。
		 * @abstract
		 */
		function GridDataMapper() {}

		var abstractMethods = [

		/**
		 * @method
		 * @protected
		 * @abstract
		 * @name _changeCount
		 * @memberOf GridDataMapper#
		 */
		'_changeCount'];

		function callChangeCount() {
			/* jshint validthis: true */
			this._changeCount();
		}

		var eventListeners = {
			_searcher: {
				'changeSource': callChangeCount,
				'edit': callChangeCount,
				'changeSearchSuccess': callChangeCount,
				'refreshSearchSuccess': callChangeCount,
				'commitSuccess': callChangeCount,
				'rollback': callChangeCount
			}
		};

		/** @lends GridDataMapper# */
		var gridDataMapperDefinition = {

			// --- Metadata --- //

			/**
			 * Eclipse のアウトライン用のコメントです。
			 *
			 * @private
			 * @memberOf _GridDataMapper
			 */
			__name: ctx.className,


			// --- Public Method --- //

			getSearcher: function() {
				return this._searcher;
			},

			isReady: function() {
				return this._searcher.isReady();
			},


			// --- Protected Method --- //

			/**
			 * @protected
			 * @param {DataSearcher} searcher
			 * @param {SingleDataSelector} dataFocus
			 * @param {DataSelector} dataSelector
			 * @param {CellSelector} cellSelector
			 */
			init: function(searcher, dataFocus, dataSelector, cellSelector) {
				var validator = ctx.argsValidator('constructor');

				validator.arg('searcher', searcher, function(v) {
					v.notNull();
					//v.instanceOf(datagrid.data._privateClass.DataSearcher);
				});
				validator.arg('dataFocus', dataFocus, function(v) {
					v.notNull();
					v.instanceOf(SingleDataSelector);
				});
				validator.arg('dataSelector', dataSelector, function(v) {
					v.notNull();
					v.instanceOf(DataSelector);
				});
				validator.arg('cellSelector', cellSelector, function(v) {
					v.notNull();
					v.instanceOf(CellSelector);
				});

				this._searcher = searcher;
				this._dataFocus = dataFocus;
				this._dataSelector = dataSelector;
				this._cellSelector = cellSelector;

				this._listenerSet = util.createEventListenerSet(this);
				this._listenerSet.registerEventListeners(eventListeners);
			},

			/**
			 * @protected
			 */
			applySelect: function(cell) {
				var row = cell.row;
				var col = cell.column;

				var focusedCell = this._cellSelector.getFocusedCell();
				cell.isFocusedCell = focusedCell.row === row && focusedCell.column === col;

				var range = this._cellSelector.getSelectedRange();

				if (range == null) {
					cell.isSelectedCell = false;
					cell.isSelectedTopEdge = false;
					cell.isSelectedBottomEdge = false;
					cell.isSelectedLeftEdge = false;
					cell.isSelectedRightEdge = false;
				} else {

					var rowStart = range.rowIndex;
					var rowEnd = rowStart + range.rowLength;
					var colStart = range.columnIndex;
					var colEnd = colStart + range.columnLength;

					var inRowRange = rowStart <= row && row < rowEnd;
					var inColRange = colStart <= col && col < colEnd;

					cell.isSelectedCell = inRowRange && inColRange;
				}

				// ロードされている場合のみデータの選択を付与
				if (cell.isLoaded && cell.dataId != null) {
					cell.isFocusedData = this._dataFocus.isSelected(cell.dataId);
					cell.isSelectedData = this._dataSelector.isSelected(cell.dataId);
				} else {
					cell.isFocusedData = false;
					cell.isSelectedData = false;
				}
			},

			/**
			 * @protected
			 */
			applySelectedEdge: function(gridRange) {
				var selectedRange = this._cellSelector.getSelectedRange();
				if (selectedRange == null) {
					return;
				}

				var rowStart = selectedRange.rowIndex;
				var rowEnd = rowStart + selectedRange.rowLength;
				var columnStart = selectedRange.columnIndex;
				var columnEnd = columnStart + selectedRange.columnLength;

				for (var i = 0, rLen = gridRange.getRowLength(); i < rLen; i++) {
					for (var j = 0, cLen = gridRange.getColumnLength(); j < cLen; j++) {
						var cell = gridRange.getCell(i, j);
						var row = cell.row;
						var column = cell.column;

						var inRowRange = rowStart <= row && row < rowEnd;
						var inColumnRange = columnStart <= column && column < columnEnd;

						var border;

						if (row + 1 === rowStart && inColumnRange) {
							border = gridRange.getBottomBorder(i, j);
							border.width = SELECTED_BORDER_WIDTH;
							border.classes = ['gridSelectedRangeEdge'];
						} else if (row === rowStart && inColumnRange) {
							border = gridRange.getTopBorder(i, j);
							border.width = SELECTED_BORDER_WIDTH;
							border.classes = ['gridSelectedRangeEdge'];
						}

						if (row + 1 === rowEnd && inColumnRange) {
							border = gridRange.getBottomBorder(i, j);
							border.width = SELECTED_BORDER_WIDTH;
							border.classes = ['gridSelectedRangeEdge'];
						} else if (row === rowEnd && inColumnRange) {
							border = gridRange.getTopBorder(i, j);
							border.width = SELECTED_BORDER_WIDTH;
							border.classes = ['gridSelectedRangeEdge'];
						}

						if (column + 1 === columnStart && inRowRange) {
							border = gridRange.getRightBorder(i, j);
							border.width = SELECTED_BORDER_WIDTH;
							border.classes = ['gridSelectedRangeEdge'];
						} else if (column === columnStart && inRowRange) {
							border = gridRange.getLeftBorder(i, j);
							border.width = SELECTED_BORDER_WIDTH;
							border.classes = ['gridSelectedRangeEdge'];
						}

						if (column + 1 === columnEnd && inRowRange) {
							border = gridRange.getRightBorder(i, j);
							border.width = SELECTED_BORDER_WIDTH;
							border.classes = ['gridSelectedRangeEdge'];
						} else if (column === columnEnd && inRowRange) {
							border = gridRange.getLeftBorder(i, j);
							border.width = SELECTED_BORDER_WIDTH;
							border.classes = ['gridSelectedRangeEdge'];
						}
					}
				}
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {DataSearcher}
			 */
			_searcher: null,

			/**
			 * @private
			 * @type {SingleDataSelector}
			 */
			_dataFocus: null,

			/**
			 * @private
			 * @type {DataSelector}
			 */
			_dataSelector: null,

			/**
			 * @private
			 * @type {CellSelector}
			 */
			_cellSelector: null,

			/**
			 * @private
			 * @type {EventListenerSet}
			 */
			_listenerSet: null
		};

		return {
			constructorFunction: GridDataMapper,
			abstractMethods: abstractMethods,
			mixins: [h5.mixin.eventDispatcher, util.disposable, util.ownSupport],
			definition: gridDataMapperDefinition
		};
	});


	// ---- PropertyGridDataMapper ---- //

	var PropertyGridDataMapper = defineClass(NAMESPACE + '.PropertyGridDataMapper', function(ctx) {

		var DEFAULT_PROPERTY_MIN_SIZE = 30;
		var DEFAULT_PROPERTY_MAX_SIZE = 1000;

		/**
		 * このコンストラクタはユーザが直接呼び出すことはありません。
		 *
		 * @constructor PropertyGridDataMapper
		 * @class 各プロパティをひとつの列、または行として扱う {@link GridDataMapper} です。
		 * @extends GridDataMapper
		 * @param {DataSearcher} searcher
		 * @param {SingleDataSelector} dataFocus
		 * @param {DataSelector} dataSelector
		 * @param {CellSelector} cellSelector
		 * @param {PropertyGridDataMapperParam} param
		 */
		function PropertyGridDataMapper(searcher, dataFocus, dataSelector, cellSelector, param) {
			var validator = ctx.argsValidator('constructor');

			validator.arg('searcher', searcher, $.noop);
			validator.arg('dataFocus', dataFocus, $.noop);
			validator.arg('dataSelector', dataSelector, $.noop);
			validator.arg('cellSelector', cellSelector, $.noop);
			validator.arg('param', param, type.validatePropertyGridDataMapperParam);

			this.init(searcher, dataFocus, dataSelector, cellSelector);
			this._param = $.extend(true, {}, param);


			// TODO: definition にあり hierarchy にないものを自動登録したい
			this._headerProperties = new GridPropertyHierarchy(param.propertyHierarchy);
			this._mainProperties = new GridPropertyHierarchy(param.propertyHierarchy);

			var visibleProperties = param.visibleProperties;
			util.forEach(visibleProperties.header, this.own(function(headerProperty, i) {
				this._headerProperties.addProperty(headerProperty, i);
			}));
			util.forEach(visibleProperties.main, this.own(function(mainProperty, i) {
				this._mainProperties.addProperty(mainProperty, i);
			}));

			var propertySizeParam = param.propertyDirectionSize;

			var defaultEnableResize = true;
			if (propertySizeParam.enableResize != null) {
				defaultEnableResize = propertySizeParam.enableResize;
			}

			this._propertyMinSize = DEFAULT_PROPERTY_MIN_SIZE;
			if (propertySizeParam.minSize != null) {
				this._propertyMinSize = propertySizeParam.minSize;
			}

			this._propertyMaxSize = DEFAULT_PROPERTY_MAX_SIZE;
			if (propertySizeParam.maxSize != null) {
				this._propertyMaxSize = propertySizeParam.maxSize;
			}

			var sizeHolder = new SizeHolder(propertySizeParam.defaultSize);
			this._propertySizeHolder = sizeHolder;

			this._propertyDefinitionSet = {};

			util.forEach(param.propertyDefinition, this.own(function(definition, property) {
				var isLeaf = this._mainProperties.isLeafProperty(property);

				if (isLeaf && definition.size != null) {
					sizeHolder.setSize(property, definition.size);
				}

				var headerValue = property;
				if (definition.headerValue != null) {
					headerValue = definition.headerValue;
				}

				var toValueFunction = defaultToValue;
				if (definition.toValue != null) {
					toValueFunction = definition.toValue;
				}

				var toCopyValuesFunction = defaultToCopyValues;
				if (definition.toCopyValues != null) {
					toCopyValuesFunction = definition.toCopyValues;
				}

				var enableResize = defaultEnableResize;
				if (!isLeaf) {
					enableResize = false;
				} else if (definition.enableResize != null) {
					enableResize = definition.enableResize;
				}

				this._propertyDefinitionSet[property] = {
					headerValue: headerValue,
					toValue: toValueFunction,
					toCopyValues: toCopyValuesFunction,
					enableResize: enableResize
				};
			}));

			var dataSizeParam = param.dataDirectionSize;
			var cells = this._getDataDirectionCells();
			this._dataDirectionSizeSet = new SingleValueCellSizeSet(dataSizeParam.size, cells);

			var defaultPropertySize = propertySizeParam.defaultSize;
			this._propertyDirectionSizeSet = new ArrayCellSizeSet([], defaultPropertySize);
			this._refreshPropertySize();
		}

		function defaultToValue(data, cell) {
			if (data == null) {
				return null;
			}

			var propertyName = cell.propertyName;

			return data[propertyName];
		}

		function defaultToCopyValues(cell) {
			return [cell.editedValue];
		}

		/** @lends PropertyGridDataMapper# */
		var propertyDataGridMapperDefinition = {

			// --- Metadata --- //

			/**
			 * このコメントは eclipse のアウトライン用です。
			 *
			 * @private
			 * @memberOf _PropertyGridDataMapper
			 */
			__name: ctx.className,

			// --- Public Event --- //

			/**
			 * プロパティの並びまたはサイズが変更されたことを表すイベントです。
			 *
			 * @event ProepertyGridDataMapper#changeProperty
			 */


			// --- Public Method --- //
			getDataDirection: function() {
				return this._param.direction;
			},

			/**
			 * ヘッダ行の数を返します。
			 *
			 * @returns {Length} ヘッダ行の数
			 */
			getHeaderRows: function() {
				if (this._isVertical()) {
					return this._mainProperties.getMaxDepth();
				}
				return this._getHeaderCells();
			},

			/**
			 * ヘッダ列の数を返します。
			 *
			 * @returns {Length} ヘッダ列の数
			 */
			getHeaderColumns: function() {
				if (this._isVertical()) {
					return this._getHeaderCells();
				}
				return this._mainProperties.getMaxDepth();
			},

			/**
			 * 全体の行数を返します。
			 *
			 * @returns {Length} 行の数
			 */
			getTotalRows: function() {
				if (this._isVertical()) {
					return this._getDataDirectionCells();
				}
				return this._getPropertyDirectionCells();
			},

			/**
			 * 全体の列数を返します。
			 *
			 * @returns {Length} 列の数
			 */
			getTotalColumns: function() {
				if (this._isVertical()) {
					return this._getPropertyDirectionCells();
				}
				return this._getDataDirectionCells();
			},

			/**
			 * データを取得するためのリクエストを行います。
			 *
			 * @param {GridRequestParam} requestParam リクエストのパラメータ
			 * @returns {GridRequest} リクエスト
			 */
			request: function(requestParam) {
				var validator = ctx.argsValidator('public');
				validator.arg('requestParam', requestParam, type.validateGridRequestParam);

				var depth = this._mainProperties.getMaxDepth();

				var startIndex;
				var endIndex;

				util.forEach(requestParam, this.own(function(range) {
					var dIndex = this._isVertical() ? range.rowIndex : range.columnIndex;
					var dLength = this._isVertical() ? range.rowLength : range.columnLength;

					var index = dIndex - depth;

					if (startIndex == null) {
						// データがない場合は抜ける
						if (index + dLength <= 0) {
							return;
						}
						startIndex = index;
						endIndex = index + dLength;
					} else {
						if (index < startIndex) {
							startIndex = index;
						}
						if (endIndex < index + dLength) {
							endIndex = index + dLength;
						}
					}
				}));

				if (startIndex == null || startIndex < 0) {
					startIndex = 0;
				}
				if (endIndex == null || endIndex < 0) {
					endIndex = 0;
				}

				var length = endIndex - startIndex;

				var searchReference = this._searcher.getReference({
					index: startIndex,
					length: length
				});

				var dataReferences = searchReference.getDataReferences();
				var searchParam = searchReference.getSearchParam();

				var rangeSet = this._mapRangeSet(requestParam, searchParam, dataReferences,
						startIndex);

				var isAllLoaded = util.every(rangeSet, function(range) {
					return range.isAllLoaded();
				});

				var fetchFunction = this.own(function() {
					var promise = searchReference.fetch();
					return promise.then(this.own(function(fetchResult) {
						var dataReferences = util.map(fetchResult.dataArray, function(data) {
							return {
								isLoaded: true,
								data: data
							};
						});
						return this._mapRangeSet(requestParam, searchParam, dataReferences,
								startIndex);
					}));
				});

				return new GridRequest(rangeSet, isAllLoaded, fetchFunction);
			},

			getVisibleProperties: function() {
				return {
					header: this._headerProperties.getLeafProperties(),
					main: this._mainProperties.getLeafProperties()
				};
			},

			/**
			 * 指定したプロパティの挿入可能なインデックスを取得します。
			 *
			 * @param {PropertyName} propertyName プロパティ名
			 * @returns {Array.<Index>} 挿入可能なインデックスの配列
			 */
			getPropertyInsertableIndexes: function(propertyName) {
				var validator = ctx.argsValidator('public');
				validator.arg('propertyName', propertyName, type.validatePropertyName);

				var inHeader = this._headerProperties.isVisibleRoot(propertyName);

				if (inHeader) {
					return this._headerProperties.getInsertableIndexes();
				}

				var headerSize = this._getHeaderCells();
				var mainIndexes = this._mainProperties.getInsertableIndexes();
				mainIndexes = util.map(mainIndexes, function(index) {
					return index + headerSize;
				});

				var inMain = this._mainProperties.isVisibleRoot(propertyName);
				if (inMain) {
					return mainIndexes;
				}

				var headerIndexes = this._headerProeperties.getInsertableIndexes();
				return headerIndexes.concat(mainIndexes);
			},

			/**
			 * メイン領域にプロパティを追加します。
			 *
			 * @param {PropertyName} propertyName プロパティ名
			 * @param {Index} insertIndex 挿入するインデックス
			 */
			addVisibleMainProperty: function(propertyName, insertIndex) {
				var validator = ctx.argsValidator('public');

				validator.arg('propertyName', propertyName, type.validatePropertyName);
				validator.arg('insertIndex', insertIndex, type.validateIndex);

				var index = insertIndex - this._getHeaderCells();
				this._mainProperties.addProperty(propertyName, index);

				this._refreshPropertySize();
				this._dispatchChangePropertyEvent();
			},

			/**
			 * メイン領域内でプロパティを移動します。
			 *
			 * @param {PropertyName} propertyName プロパティ名
			 * @param {Index} insertIndex 挿入するインデックス
			 */
			moveVisibleMainProperty: function(propertyName, insertIndex) {
				var validator = ctx.argsValidator('public');

				validator.arg('propertyName', propertyName, type.validatePropertyName);
				validator.arg('insertIndex', insertIndex, type.validateIndex);

				var index = insertIndex - this._getHeaderCells();
				this._mainProperties.moveProeprty(propertyName, index);

				this._refreshPropertySize();
				this._dispatchChangePropertyEvent();
			},

			/**
			 * メイン領域からプロパティを削除します。
			 *
			 * @param {PropertyName} propertyName プロパティ名
			 */
			removeVisibleMainProperty: function(propertyName) {
				var validator = ctx.argsValidator('public');
				validator.arg('propertyName', propertyName, type.validatePropertyName);

				this._mainProperties.removeProperty(propertyName);

				this._refreshPropertySize();
				this._dispatchChangePropertyEvent();
			},

			/**
			 * ヘッダ領域にプロパティを追加します。
			 *
			 * @param {PropertyName} propertyName プロパティ名
			 * @param {Index} insertIndex 挿入するインデックス
			 */
			addVisibleHeaderProperty: function(propertyName, insertIndex) {
				var validator = ctx.argsValidator('public');

				validator.arg('propertyName', propertyName, type.validatePropertyName);
				validator.arg('insertIndex', insertIndex, type.validateIndex);

				this._headerProperties.addProperty(propertyName, insertIndex);

				this._refreshPropertySize();
				this._dispatchChangePropertyEvent();
			},

			/**
			 * ヘッダ領域内でプロパティを移動します。
			 *
			 * @param {PropertyName} propertyName プロパティ名
			 * @param {Index} insertIndex 挿入するインデックス
			 */
			moveVisibleHeaderProperty: function(propertyName, insertIndex) {
				var validator = ctx.argsValidator('public');

				validator.arg('propertyName', propertyName, type.validatePropertyName);
				validator.arg('insertIndex', insertIndex, type.validateIndex);

				this._headerProperties.moveProperty(propertyName, insertIndex);

				this._refreshPropertySize();
				this._dispatchChangePropertyEvent();
			},

			/**
			 * ヘッダ領域からプロパティを削除します。
			 *
			 * @param {PropertyName} propertyName プロパティ名
			 */
			removeVisibleHeaderProperty: function(propertyName) {
				var validator = ctx.argsValidator('public');
				validator.arg('propertyName', propertyName, type.validatePropertyName);

				this._headerProperties.removeProperty(propertyName);

				this._refreshPropertySize();
				this._dispatchChangePropertyEvent();
			},

			/**
			 * 可視のプロパティを一括で変更します。
			 *
			 * @param {VisibleProperties} visibleProperties
			 */
			resetVisibleProperties: function(visibleProperties) {
				var validator = ctx.argsValidator('public');
				validator.arg('visibleProperties', visibleProperties,
						type.validateVisibleProperties);

				// 既存のプロパティを削除
				var oldHeader = this._headerProperties.getLeafProperties();
				util.forEach(oldHeader, this.own(function(propertyName) {
					this._headerProperties.removeProperty(propertyName);
				}));

				var oldMain = this._mainProperties.getLeafProperties();
				util.forEach(oldMain, this.own(function(propertyName) {
					this._mainProperties.removeProperty(propertyName);
				}));

				// 新しいプロパティを追加
				util.forEach(visibleProperties.header, this.own(function(propertyName, i) {
					this._headerProperties.addProperty(propertyName, i);
				}));

				util.forEach(visibleProperties.main, this.own(function(propertyName, i) {
					this._mainProperties.addProperty(propertyName, i);
				}));

				// 後処理
				this._refreshPropertySize();
				this._dispatchChangePropertyEvent();
			},

			/**
			 * プロパティの最小サイズ
			 *
			 * @returns {PixelSize} 最小サイズ
			 */
			getPropertyMinSize: function() {
				return this._propertyMinSize;
			},

			/**
			 * プロパティの最大サイズ
			 *
			 * @returns {PixelSize} 最大サイズ
			 */
			getPropertyMaxSize: function() {
				return this._propertyMaxSize;
			},

			/**
			 * プロパティのサイズを変更します。
			 *
			 * @param {PropertyName} propertyName プロパティ名
			 * @param {PixelSize} size サイズ
			 */
			setPropertySize: function(propertyName, size) {
				var validator = ctx.argsValidator('public');

				validator.arg('propertyName', propertyName, type.validatePropertyName);
				validator.arg('size', size, type.validatePixelSize);

				if (size < this._propertyMinSize || this._propertyMaxSize < size) {
					throw new Error('指定されたサイズが許可された範囲外の値です');
				}

				this._propertySizeHolder.setSize(propertyName, size);

				this._refreshPropertySize();
				// MEMO: サイズ変更はイベントを分けるべきかも
				this._dispatchChangePropertyEvent();
			},

			/**
			 * 行の高さを変更するという操作が実行可能であるかを返します。
			 *
			 * @returns {boolean} 実行可能であれば true、そうでなければ false
			 */
			canSetRowHeight: function() {
				return !this._isVertical();
			},

			/**
			 * 行の高さを変更する際に指定可能な最小のサイズを返します。
			 *
			 * @returns {PixelSize} 指定可能な最小のサイズ
			 */
			getRowHeightMin: function() {
				if (!this.canSetRowHeight()) {
					throw error.NotSupported('setRowHeight');
				}
				return this._propertyMinSize;
			},

			/**
			 * 行の高さを変更する際に指定可能な最大のサイズを返します。
			 *
			 * @returns {PixelSize} 指定可能な最大のサイズ
			 */
			getRowHeightMax: function() {
				if (!this.canSetRowHeight()) {
					throw error.NotSupported('setRowHeight');
				}
				return this._propertyMaxSize;
			},

			/**
			 * 行の高さを変更します。
			 *
			 * @param {Index} row 行
			 * @param {PixelSize} size サイズ
			 */
			setRowHeight: function(row, size) {
				if (!this.canSetRowHeight()) {
					throw error.NotSupported('setRowHeight');
				}
				var propertyName = this._toPropertyFromIndex(row);
				this.setPropertySize(propertyName, size);
			},

			/**
			 * 列の幅を変更するという操作が実行可能であるかを返します。
			 *
			 * @returns {boolean} 実行可能であれば true、そうでなければ false
			 */
			canSetColumnWidth: function() {
				return this._isVertical();
			},

			/**
			 * 列の幅を変更する際に指定可能な最小のサイズを返します。
			 *
			 * @returns {PixelSize} 指定可能な最小のサイズ
			 */
			getColumnWidthMin: function() {
				if (!this.canSetColumnWidth()) {
					throw error.NotSupported('setColumnWidth');
				}
				return this._propertyMinSize;
			},

			/**
			 * 列の幅を変更する際に指定可能な最大のサイズを返します。
			 *
			 * @returns {PixelSize} 指定可能な最大のサイズ
			 */
			getColumnWidthMax: function() {
				if (!this.canSetColumnWidth()) {
					throw error.NotSupported('setColumnWidth');
				}
				return this._propertyMaxSize;
			},

			/**
			 * 列の幅を変更します。
			 *
			 * @param {Index} column
			 * @param {PixelSize} size
			 */
			setColumnWidth: function(column, size) {
				if (!this.canSetColumnWidth()) {
					throw error.NotSupported('setColumnWidth');
				}
				var propertyName = this._toPropertyFromIndex(column);
				this.setPropertySize(propertyName, size);
			},

			getRowHeightSet: function() {
				if (this._isVertical()) {
					return this._dataDirectionSizeSet;
				}
				return this._propertyDirectionSizeSet;
			},

			getColumnWidthSet: function() {
				if (this._isVertical()) {
					return this._propertyDirectionSizeSet;
				}
				return this._dataDirectionSizeSet;
			},

			// --- Implement Protected Method --- //

			_changeCount: function() {
				var cells = this._getDataDirectionCells();
				this._dataDirectionSizeSet.setCells(cells);
			},


			// --- Private Property --- //

			/**
			 * @private
			 * @type {PropertyGridDataMapperParam}
			 */
			_param: null,

			/**
			 * @private
			 * @type {PixelSize}
			 */
			_propertyMinSize: null,

			/**
			 * @private
			 * @type {PixelSize}
			 */
			_propertyMaxSize: null,

			/**
			 * @private
			 * @type {GridPropertyHierarchy}
			 */
			_headerProperties: null,

			/**
			 * @private
			 * @type {GridPropertyHierarchy}
			 */
			_mainProperties: null,

			/**
			 * @private
			 * @type {SizeHolder}
			 */
			_propertySizeHolder: null,

			/**
			 * @private
			 * @type {ArraySizeSet}
			 */
			_propertyDirectionSizeSet: null,

			/**
			 * @private
			 * @type {SizeSet}
			 */
			_dataDirectionSizeSet: null,

			/**
			 * @private
			 * @type {Object.<PropertyName, {headerValue: Value, enableResize: boolean, toValue:
			 *       ToValueFunction}>}
			 */
			_propertyDefinitionSet: null,


			// --- Private Method --- //

			/**
			 * @private
			 * @returns {boolean}
			 */
			_isVertical: function() {
				return this._param.direction === 'vertical';
			},

			/**
			 * @private
			 * @returns {Length}
			 */
			_getDataDirectionCells: function() {
				var depth = this._mainProperties.getMaxDepth();
				return this.getSearcher().getCount() + depth;
			},

			/**
			 * @private
			 * @returns {Length}
			 */
			_getPropertyDirectionCells: function() {
				var headerLength = this._headerProperties.getLeafProperties().length;
				var mainLength = this._mainProperties.getLeafProperties().length;
				return headerLength + mainLength;
			},

			/**
			 * @private
			 * @returns {Length}
			 */
			_getHeaderCells: function() {
				return this._headerProperties.getLeafProperties().length;
			},

			/**
			 * @private
			 */
			_refreshPropertySize: function() {
				var headerProperties = this._headerProperties.getLeafProperties();
				var mainProperties = this._mainProperties.getLeafProperties();
				var properties = headerProperties.concat(mainProperties);

				var sizeArray = util.map(properties, this.own(function(property) {
					return this._propertySizeHolder.getSize(property);
				}));

				this._propertyDirectionSizeSet.setSizeArray(sizeArray);
			},

			/**
			 * @private
			 */
			_dispatchChangePropertyEvent: function() {
				// MEMO: より詳細な情報を投げるか検討が必要
				this.dispatchEvent({
					type: 'changeProperty'
				});
			},

			/**
			 * @private
			 */
			_getPropertyCells: function() {
				var header = this._headerProperties.getHeaderStructure();
				var main = this._mainProperties.getHeaderStructure();
				return header.concat(main);
			},

			/**
			 * @private
			 */
			_makePropertyCell: function(propertyCells, row, column) {
				var pIndex = this._isVertical() ? column : row;
				var dIndex = this._isVertical() ? row : column;

				var cell = propertyCells[pIndex][dIndex];
				if (cell.isBaseCell) {
					var headerValue = this._propertyDefinitionSet[cell.property].headerValue;
					var enableResize = this._propertyDefinitionSet[cell.property].enableResize;
					var rowSpan = this._isVertical() ? cell.dataSpan : cell.propertySpan;
					var colSpan = this._isVertical() ? cell.propertySpan : cell.dataSpan;
					var result = {
						isBlank: false,
						propertyName: cell.property,
						row: row,
						column: column,
						rowSpan: rowSpan,
						colSpan: colSpan,
						isLoaded: true,
						isPropertyHeader: true,
						isHeaderRow: row < this.getHeaderRows(),
						isHeaderColumn: column < this.getHeaderColumns(),
						originalValue: headerValue,
						editedValue: headerValue,
						enableResize: enableResize
					};

					if (this._mainProperties.isLeafProperty(cell.property)) {
						var key = this._isVertical() ? 'columnWidthKey' : 'rowHeightKey';
						result[key] = cell.property;
					}

					return result;
				}

				var rowOffset = this._isVertical() ? cell.dataOffset : cell.propertyOffset;
				var colOffset = this._isVertical() ? cell.propertyOffset : cell.dataOffset;
				return {
					isBlank: true,
					rowOffset: rowOffset,
					colOffset: colOffset,
					row: row,
					column: column
				};
			},

			/**
			 * @private
			 */
			_makeDataCell: function(properties, row, column, index) {
				var pIndex = this._isVertical() ? column : row;
				var property = properties[pIndex];

				var result = {
					isBlank: false,
					index: index,
					propertyName: property,
					row: row,
					column: column,
					rowSpan: 1,
					colSpan: 1,
					isPropertyHeader: false,
					isHeaderRow: row < this.getHeaderRows(),
					isHeaderColumn: column < this.getHeaderColumns(),
					isLoaded: false
				};

				var key = this._isVertical() ? 'columnWidthKey' : 'rowHeightKey';
				result[key] = property;

				return result;
			},

			/**
			 * @private
			 * @returns {boolean}
			 */
			_isPropertyHeaderCell: function(row, column) {
				var dIndex = this._isVertical() ? row : column;
				return dIndex < this._mainProperties.getMaxDepth();
			},

			/**
			 * @private
			 */
			_applyLoadedData: function(cell, data) {
				cell.isLoaded = true;


				cell.dataId = data.dataId;
				cell.editStatus = data.editStatus;
				cell.originalData = data.original;
				cell.editedData = data.edited;

				if (data.tree != null) {
					cell.tree = data.tree;
				}
			},

			/**
			 * @private
			 */
			_applyToValue: function(cell) {
				var toValue = this._propertyDefinitionSet[cell.propertyName].toValue;
				cell.originalValue = toValue(cell.originalData, cell);
				cell.editedValue = toValue(cell.editedData, cell);
			},

			/**
			 * @private
			 */
			_applyToCopyValues: function(cell) {
				if (cell.isBlank) {
					cell.copyValues = [''];
					return;
				}
				var toCopyValues = this._propertyDefinitionSet[cell.propertyName].toCopyValues;
				cell.copyValues = toCopyValues(cell);
			},

			/**
			 * @private
			 */
			_mapRange: function(param) {

				var range = param.range;
				var searchParam = param.searchParam;
				var propertyCells = param.propertyCells;
				var properties = param.properties;
				var dataArray = param.dataArray;
				var startIndex = param.startIndex;


				var depth = this._mainProperties.getMaxDepth();

				var i, j, rLen, cLen;

				var cells = [];
				for (i = 0, rLen = range.rowLength; i < rLen; i++) {
					var row = i + range.rowIndex;

					var rowCells = [];
					for (j = 0, cLen = range.columnLength; j < cLen; j++) {
						var column = j + range.columnIndex;
						var cell;

						var isPropertyHeader = this._isPropertyHeaderCell(row, column);
						var index;
						var data;

						if (isPropertyHeader) {
							cell = this._makePropertyCell(propertyCells, row, column);
						} else {
							var dIndex = this._isVertical() ? row : column;
							index = dIndex - depth;

							cell = this._makeDataCell(properties, row, column, index);

							data = dataArray[index - startIndex];
							if (data.isLoaded) {
								this._applyLoadedData(cell, data.data);
							}
						}

						this.applySelect(cell);

						if (cell.editedData != null) {
							this._applyToValue(cell);
						}
						this._applyToCopyValues(cell);

						rowCells.push(cell);
					}

					cells.push(rowCells);
				}
				// TODO: 変換後に offset を見て広げる(top と left も設定）

				var rowHeightSet = this._isVertical() ? this._dataDirectionSizeSet
						: this._propertyDirectionSizeSet;
				var columnWidthSet = this._isVertical() ? this._propertyDirectionSizeSet
						: this._dataDirectionSizeSet;


				rLen = cells.length;
				cLen = (rLen === 0) ? 0 : cells[0].length;

				// MEMO: 結合を含む場合はボーダーはもっと複雑になる
				var borderWidth = 1;
				var verticalBorders = [];
				for (i = 0; i < rLen; i++) {
					var vBorderRow = [];
					for (j = 0; j < cLen + 1; j++) {
						vBorderRow.push({
							width: borderWidth,
							classes: []
						});
					}
					verticalBorders.push(vBorderRow);
				}

				var horizontalBorders = [];
				for (i = 0; i < rLen + 1; i++) {
					var hBorderRow = [];
					for (j = 0; j < cLen; j++) {
						hBorderRow.push({
							width: borderWidth,
							classes: []
						});
					}
					horizontalBorders.push(hBorderRow);
				}

				var sortOrder = {};
				var sortParam = null;
				if (searchParam != null) {
					sortParam = searchParam.sort;
				}

				util.forEach(sortParam, function(value) {
					sortOrder[value.property] = value.order;
				});



				var gridRange = new GridRange({
					rowStartIndex: range.rowIndex,
					columnStartIndex: range.columnIndex,
					top: 0,
					left: 0,
					cells: cells,
					rowHeightSet: rowHeightSet,
					columnWidthSet: columnWidthSet,
					verticalBorders: verticalBorders,
					horizontalBorders: horizontalBorders,
					sortOrder: sortOrder
				});

				// 選択の端のボーダーのスタイル変更
				this.applySelectedEdge(gridRange);

				return gridRange;
			},

			/**
			 * @private
			 * @param {GridRequestParam} requestParam
			 * @param {SearchParam} searchParam
			 * @param {Array.<DataReference>} dataReferences
			 * @param {Index} startIndex
			 * @returns {Object.<string, GridRange>}
			 */
			_mapRangeSet: function(requestParam, searchParam, dataReferences, startIndex) {
				var validator = ctx.argsValidator('private');

				validator.arg('requestParam', requestParam, type.validateGridRequestParam);
				validator.arg('searchParam', searchParam, type.validateSearchParam);
				validator.arg('dataReferences', dataReferences, function(v) {
					v.notNull();
					v.array();
					v.values(type.validateDataReference);
				});
				validator.arg('startIndex', startIndex, type.validateIndex);


				var propertyCells = this._getPropertyCells();

				var headerProperties = this._headerProperties.getLeafProperties();
				var mainProperties = this._mainProperties.getLeafProperties();
				var properties = headerProperties.concat(mainProperties);

				return util.mapObject(requestParam, this.own(function(rangeParam, key) {
					var param = {
						range: rangeParam,
						searchParam: searchParam,
						propertyCells: propertyCells,
						properties: properties,
						dataArray: dataReferences,
						startIndex: startIndex
					};

					var range = this._mapRange(param);
					return {
						key: key,
						value: range
					};
				}));
			},

			/**
			 * @private
			 * @param {Index} index
			 * @returns {PropertyName}
			 */
			_toPropertyFromIndex: function(index) {
				var headerProperties = this._headerProperties.getLeafProperties();
				var mainProperties = this._mainProperties.getLeafProperties();
				var properties = headerProperties.concat(mainProperties);

				return properties[index];
			}
		};

		return {
			constructorFunction: PropertyGridDataMapper,
			superConstructorFunction: GridDataMapper,
			definition: propertyDataGridMapperDefinition
		};
	});

	//=============================
	// GridLogic
	//=============================

	function changeGridHandler(event) {
		/* jshint validthis: true */
		this._changeEventThrottle.call(event);
	}

	function aggregateChanges(a, b) {
		if (a == null) {
			return [[b[0]]];
		}
		return [a[0].concat(b[0])];
	}

	function dispatchChangeGridEvent(changes) {
		/* jshint validthis: true */
		this.log.trace('trigger "changeGrid": {0}', util.toVerboseString(changes, 1));
		this.dispatchEvent({
			type: 'changeGrid',
			changes: changes
		});
	}


	var logicEventListeners = {
		_dataSearcher: {
			readySearch: function() {
				this.log.trace('Ready: {0}', this.__name);
				this.dispatchEvent({
					type: 'readyGridLogic'
				});
			},

			changeSource: changeGridHandler,
			edit: changeGridHandler,

			commitStart: 'propagate',
			commitSuccess: 'propagate',
			commitError: 'propagate',
			commitComplete: 'propagate',

			rollback: changeGridHandler,

			changeSearchStart: 'propagate',
			changeSearchSuccess: 'propagate',
			changeSearchError: 'propagate',
			changeSearchComplete: 'propagate',

			refreshSearchStart: 'propagate',
			refreshSearchSuccess: 'propagate',
			refreshSearchError: 'propagate',
			refreshSearchComplete: 'propagate'
		},

		_dataMapper: {
			changeProperty: changeGridHandler
		},


		_cellSelector: {
			changeCellSelect: changeGridHandler
		}
	};

	/** @lends GridLogic# */
	var gridLogicDefinition = {

		// --- Metadata --- //

		/**
		 * @memberOf GridLogic
		 * @private
		 */
		__name: 'h5.ui.components.datagrid.logic.GridLogic',


		// --- Life Cycle Method --- //

		/**
		 * @constructs GridLogic
		 */
		__construct: function() {
			h5.mixin.eventDispatcher.mix(this);
			util.disposable.mix(this);
		},

		__dispose: function() {
			if (this._dataMapper == null) {
				return;
			}

			this._dataMapper.dispose();
			this._dataFocus.dispose();
			this._dataSelector.dispose();
			this._cellSelector.dispose();
			this._changeEventThrottle.dispose();
		},

		// --- Event --- //

		/**
		 * グリッドを利用する準備ができたことを表すイベントです。
		 *
		 * @event GridLogic#readyGridLogic
		 * @type {ReadyGridLogicEvent}
		 */

		/**
		 * グリッドが変更されたことを表すイベントです。
		 *
		 * @event GridLogic#changeGrid
		 * @type {ChangeGridEvent}
		 */

		/**
		 * 検索条件の変更を開始したことを表すイベントです。
		 *
		 * @event GridLogic#changeSearchStart
		 * @type {ChangeSearchStartEvent}
		 */

		/**
		 * 検索条件の変更が成功したことを表すイベントです。
		 *
		 * @event GridLogic#changeSearchSuccess
		 * @type {ChangeSearchSuccessEvent}
		 */

		/**
		 * 検索条件の変更が失敗したことを表すイベントです。
		 *
		 * @event GridLogic#changeSearchError
		 * @type {ChangeSearchErrorEvent}
		 */

		/**
		 * 検索条件の変更が完了したことを表すイベントです。
		 * <p>
		 * このイベントは検索条件の変更の成否に関わらず発生します。
		 * </p>
		 *
		 * @event GridLogic#changeSearchComplete
		 * @type {ChangeSearchCompleteEvent}
		 */

		/**
		 * データのリフレッシュを開始したことを表すイベントです。
		 *
		 * @event GridLogic#refreshSearchStart
		 * @type {RefreshSearchStartEvent}
		 */

		/**
		 * データのリフレッシュが成功したことを表すイベントです。
		 *
		 * @event GridLogic#refreshSearchSuccess
		 * @type {RefreshSearchSuccessEvent}
		 */

		/**
		 * データのリフレッシュが失敗したことを表すイベントです。
		 *
		 * @event GridLogic#refreshSearchError
		 * @type {RefreshSearchErrorEvent}
		 */

		/**
		 * データのリフレッシュが完了したことを表すイベントです。
		 * <p>
		 * このイベントはリフレッシュの成否に関わらず発生します。
		 * </p>
		 *
		 * @event GridLogic#refreshSearchComplete
		 * @type {RefreshSearchCompleteEvent}
		 */

		/**
		 * 編集のコミットを開始したことを表すイベントです。
		 *
		 * @event GridLogic#commitStart
		 * @type {CommitStartEvent}
		 */

		/**
		 * 編集のコミットが成功したことを表すイベントです。
		 *
		 * @event GridLogic#commitSuccess
		 * @type {CommitSuccessEvent}
		 */

		/**
		 * 編集のコミットが失敗したことを表すイベントです。
		 *
		 * @event GridLogic#commitError
		 * @type {CommitErrorEvent}
		 */

		/**
		 * 編集のコミットが完了したことを表すイベントです。
		 * <p>
		 * このイベントは成否に関わらず発生します。
		 * </p>
		 *
		 * @event GridLogic#commitComplete
		 * @type {CommitCompleteEvent}
		 */


		// --- Public Method --- //
		/**
		 * {@link GridLogic} を初期化します。
		 */
		init: function(dataSource, param) {
			var validateCategory = this.__name + ':public';
			var validator = util.validator.createArgumentsValidator(validateCategory);

			validator.arg('dataSource', dataSource, function(v) {
				v.notNull();
				v.instanceOf(datagrid.data._privateClass.DataSource);
			});
			validator.arg('param', param, type.validateGridLogicParam);


			var dataFocus = new SingleDataSelector();
			var dataSelector = new MultiDataSelector();
			var cellSelector = new CellSelector();

			// TODO: eager で切替
			var searcher;
			if (param.searcher.type === 'all') {
				searcher = new datagrid.data._privateClass.AllFetchSearcher(dataSource);
			} else if (param.searcher.type === 'lazy') {
				var searcherParam = param.searcher.param;
				searcher = new datagrid.data._privateClass.LazyFetchSearcher(dataSource,
						searcherParam);
			}

			// ページング機能付きDataSearcherでwrapする
			if (typeof param.searcher.paging !== 'undefined' && param.searcher.paging.enable) {
				searcher = new datagrid.data._privateClass.PagingDataSearcher(searcher,
						param.searcher.paging.pageSize);
			}

			var mapperParam = param.mapper.param;
			var mapper = new PropertyGridDataMapper(searcher, dataFocus, dataSelector,
					cellSelector, mapperParam);

			this._dataFocus = dataFocus;
			this._dataSelector = dataSelector;
			this._cellSelector = cellSelector;
			this._dataSource = dataSource;
			this._dataSearcher = searcher;
			this._dataMapper = mapper;


			var rowHeightSet = this._dataMapper.getRowHeightSet();
			var columnWidthSet = this._dataMapper.getColumnWidthSet();

			var headerRows = this._dataMapper.getHeaderRows();
			var headerColumns = this._dataMapper.getHeaderColumns();

			var scrollRowHeightSet = new ScrollAreaCellSizeSet(rowHeightSet, headerRows);
			var scrollColumnWidthSet = new ScrollAreaCellSizeSet(columnWidthSet, headerColumns);

			this._scrollRowHeightSet = scrollRowHeightSet;
			this._scrollColumnWidthSet = scrollColumnWidthSet;

			this._verticalScrollCalculator = null;
			if (param.scroll.vertical === 'pixel') {
				this._verticalScrollCalculator = new PixelScrollCalculator(scrollRowHeightSet);
			} else {
				this._verticalScrollCalculator = new IndexScrollCalculator(scrollRowHeightSet);
			}

			this._horizontalScrollCalculator = null;
			if (param.scroll.horizontal === 'pixel') {
				this._horizontalScrollCalculator = new PixelScrollCalculator(scrollColumnWidthSet);
			} else {
				this._horizontalScrollCalculator = new IndexScrollCalculator(scrollColumnWidthSet);
			}


			this._eventListenerSet = util.createEventListenerSet(this);
			this._eventListenerSet.registerEventListeners(logicEventListeners);

			var throttleFunc = this.own(dispatchChangeGridEvent);
			var throttleOption = {
				deferFirst: true,
				deferInWaiting: false,
				ignoreInCooling: false,
				aggregateArgsFunction: aggregateChanges
			};
			this._changeEventThrottle = util.createThrottle(1, throttleFunc, throttleOption);


			if (this.isReady()) {
				this.log.trace('Ready: {0}', this.__name);
				this.dispatchEvent({
					type: 'readyGridLogic'
				});
			}
		},

		/**
		 * 準備できているかを返す。
		 *
		 * @returns {boolean} 準備できた状態であれば true、そうでなければ false
		 */
		isReady: function() {
			return this._dataMapper.isReady();
		},

		/**
		 * {@link DataSource} を返します。
		 * <p>
		 * データをグリッドから編集するために利用することを想定しています。
		 * </p>
		 *
		 * @returns {DataSource} データを編集するためのオブジェクト
		 */
		getDataSource: function() {
			return this._dataSource;
		},

		/**
		 * {@link DataSearcher} を返します。
		 * <p>
		 * 検索条件をグリッドから編集するために利用することを想定しています。
		 * </p>
		 *
		 * @returns {DataSearcher} データの検索条件を変更するためのオブジェクト
		 */
		getDataSearcher: function() {
			return this._dataSearcher;
		},

		getSearchParam: function() {
			return this._dataSearcher.getSearchParam();
		},

		initSearchParam: function(searchParam) {
			this._dataSearcher.initSearchParam(searchParam);
		},


		/**
		 * 全体の行数を返します。
		 *
		 * @returns {Length} 全体の行数
		 */
		getTotalRows: function() {
			return this._dataMapper.getTotalRows();
		},

		/**
		 * 全体の列数を返します。
		 *
		 * @returns {Length} 全体の列数
		 */
		getTotalColumns: function() {
			return this._dataMapper.getTotalColumns();
		},

		/**
		 * データ数を返します。
		 *
		 * @returns {Length} データ数
		 */
		getDataCount: function() {
			// MEMO: ページングについて対応
			return this._dataSearcher.getCount();
		},

		/**
		 * ヘッダ行の数を返します。
		 *
		 * @returns {Length} ヘッダ行の数
		 */
		getHeaderRows: function() {
			return this._dataMapper.getHeaderRows();
		},

		/**
		 * ヘッダ列の数を返します。
		 *
		 * @returns {Length} ヘッダ列の数
		 */
		getHeaderColumns: function() {
			return this._dataMapper.getHeaderColumns();
		},

		/**
		 * 全体の高さを返します。
		 *
		 * @returns {PixelSize} 全体の高さ
		 */
		getTotalHeight: function() {
			return this._dataMapper.getRowHeightSet().getTotalSize();
		},

		/**
		 * 全体の幅を返します。
		 *
		 * @returns {PixelSize} 全体の幅
		 */
		getTotalWidth: function() {
			return this._dataMapper.getColumnWidthSet().getTotalSize();
		},


		/**
		 * ヘッダ行領域の高さを返します。
		 *
		 * @returns {PixelSize} ヘッダ行領域の高さ
		 */
		getHeaderRowsHeight: function() {
			var rowHeightSet = this._dataMapper.getRowHeightSet();
			var height = 0;

			for (var i = 0, len = this.getHeaderRows(); i < len; i++) {
				height += rowHeightSet.toSizeFromIndex(i);
			}

			return height;
		},

		/**
		 * ヘッダ列領域の幅を返します。
		 *
		 * @returns {PixelSize} ヘッダ列領域の幅
		 */
		getHeaderColumnsWidth: function() {
			var columnWidthSet = this._dataMapper.getColumnWidthSet();
			var width = 0;

			for (var i = 0, len = this.getHeaderColumns(); i < len; i++) {
				width += columnWidthSet.toSizeFromIndex(i);
			}

			return width;
		},

		/**
		 * メイン領域をすべて表示するのに必要な高さを返します。
		 *
		 * @returns {PixelSize} メイン領域の高さ
		 */
		getMainHeight: function() {
			return this.getTotalHeight() - this.getHeaderRowsHeight();
		},

		/**
		 * メイン領域をすべて表示するのに必要な幅を返します。
		 *
		 * @returns {PixelSize} メイン領域の幅
		 */
		getMainWidth: function() {
			return this.getTotalWidth() - this.getHeaderColumnsWidth();
		},


		getDataDirection: function() {
			return this._dataMapper.getDataDirection();
		},

		toVerticalPositionFromRow: function(row) {
			var scrollRow = row - this.getHeaderRows();
			if (scrollRow < 0) {
				return 0;
			}
			return this._scrollRowHeightSet.toPositionFromIndex(scrollRow);
		},

		toHeightFromRow: function(row) {
			return this._dataMapper.getRowHeightSet().toSizeFromIndex(row);
		},

		toRowFromVerticalPosition: function(verticalPosition) {
			var scrollRow = this._scrollRowHeightSet.toIndexFromPosition(verticalPosition);
			return scrollRow + this.getHeaderRows();
		},

		toHorizontalPositionFromColumn: function(column) {
			var scrollColumn = column - this.getHeaderColumns();
			if (scrollColumn < 0) {
				return 0;
			}
			return this._scrollColumnWidthSet.toPositionFromIndex(scrollColumn);
		},

		toWidthFromColumn: function(column) {
			return this._dataMapper.getColumnWidthSet().toSizeFromIndex(column);
		},

		toColumnFromHorizontalPosition: function(horizontalPosition) {
			var scrollColumn = this._scrollColumnWidthSet.toIndexFromPosition(horizontalPosition);
			return scrollColumn + this.getHeaderColumns();
		},


		/**
		 * @param {PixelSize} displayAreaHeight
		 * @param {ScrollPosition} verticalPos
		 * @returns {DisplayRange}
		 */
		calcVerticalDisplayRange: function(displayAreaHeight, verticalPos) {
			var range = this._verticalScrollCalculator.calcDisplayRange(displayAreaHeight,
					verticalPos);
			range.index += this.getHeaderRows();
			return range;
		},

		/**
		 * @param {PixelSize} displayAreaWidth
		 * @param {ScrollPosition} horizontalPos
		 * @returns {DisplayRange}
		 */
		calcHorizontalDisplayRange: function(displayAreaWidth, horizontalPos) {
			var range = this._horizontalScrollCalculator.calcDisplayRange(displayAreaWidth,
					horizontalPos);
			range.index += this.getHeaderColumns();
			return range;
		},

		/**
		 * 縦方向の前のセルのスクロール座標を返します。
		 *
		 * @param {PixelSize} displayAreaHeight
		 * @param {ScrollPosition} verticalPox
		 * @returns {ScrollPosition} 前のセルのスクロール座標
		 */
		calcPrevVerticalPosition: function(displayAreaHeight, verticalPos) {
			return this._verticalScrollCalculator.calcPrevPosition(displayAreaHeight, verticalPos);
		},

		/**
		 * 縦方向の次のセルのスクロール座標を返します。
		 *
		 * @param {PixelSize} displayAreaHeight
		 * @param {ScrollPosition} verticalPos
		 * @returns {ScrollPosition} 次のセルのスクロール座標
		 */
		calcNextVerticalPosition: function(displayAreaHeight, verticalPos) {
			return this._verticalScrollCalculator.calcNextPosition(displayAreaHeight, verticalPos);
		},

		/**
		 * 横方向の前のセルのスクロール座標を返します。
		 *
		 * @param {PixelSize} displayAreaWidth
		 * @param {ScrollPosition} horizontalPos
		 * @returns {ScrollPosition} 前のセルのスクロール座標
		 */
		calcPrevHorizontalPosition: function(displayAreaWidth, horizontalPos) {
			return this._horizontalScrollCalculator.calcPrevPosition(displayAreaWidth,
					horizontalPos);
		},

		/**
		 * 横方向の次のセルのスクロール座標を返します。
		 *
		 * @param {PixelSize} displayAreaWidth
		 * @param {ScrollPosition} horizontalPos
		 * @returns {ScrollPosition} 次のセルのスクロール座標
		 */
		calcNextHorizontalPosition: function(displayAreaWidth, horizontalPos) {
			return this._horizontalScrollCalculator.calcNextPosition(displayAreaWidth,
					horizontalPos);
		},

		calcVerticalDisplaySize: function(displayAreaHeight) {
			return this._verticalScrollCalculator.calcDisplaySize(displayAreaHeight);
		},

		calcHorizontalDisplaySize: function(displayAreaWidth) {
			return this._horizontalScrollCalculator.calcDisplaySize(displayAreaWidth);
		},

		getVerticalScrollEndPosition: function(displayAreaHeight) {
			return this._verticalScrollCalculator.getScrollEndPosition(displayAreaHeight);
		},

		getHorizontalScrollEndPosition: function(displayAreaWidth) {
			return this._horizontalScrollCalculator.getScrollEndPosition(displayAreaWidth);
		},

		getVisibleProperties: function() {
			return this._dataMapper.getVisibleProperties();
		},

		getPropertyInsertableIndexes: function(propertyName) {
			return this._dataMapper.getPropertyInsertableIndexes(propertyName);
		},

		addVisibleMainProperty: function(propertyName, insertIndex) {
			this._dataMapper.addVisibleMainProperty(propertyName, insertIndex);
		},

		moveVisibleMainProperty: function(propertyName, insertIndex) {
			this._dataMapper.moveVisibleMainProperty(propertyName, insertIndex);
		},

		removeVisibleMainProperty: function(propertyName) {
			this._dataMapper.removeVisibleMainProperty(propertyName);
		},

		addVisibleHeaderProperty: function(propertyName, insertIndex) {
			this._dataMapper.addVisibleHeaderProperty(propertyName, insertIndex);
		},

		moveVisibleHeaderProperty: function(propertyName, insertIndex) {
			this._dataMapper.moveVisibleHeaderProperty(propertyName, insertIndex);
		},

		removeVisibleHeaderProperty: function(propertyName) {
			this._dataMapper.removeVisibleHeaderProperty(propertyName);
		},

		resetVisibleProperties: function(visibleProperties) {
			// FIXME: PropertyCellSizeSet のヘッダ数が変化しないのでヘッダの数が変化するとおかしくなる
			this._dataMapper.resetVisibleProperties(visibleProperties);
		},

		/**
		 * 指定されたデータを選択します。
		 *
		 * @param {DataId} dataId 選択するデータのID
		 */
		selectData: function(dataId) {
			var hasChange = this._dataSelector.select(dataId);
			if (hasChange) {
				this._dipatchChangeDataSelectEvent();
			}
		},

		/**
		 * すべてのデータを選択します。
		 */
		selectDataAll: function() {
			var hasChange = this._dataSelector.selectAll();
			if (hasChange) {
				this._dipatchChangeDataSelectEvent();
			}
		},

		/**
		 * 指定されたデータの選択を解除します。
		 *
		 * @param dataId 解除するデータのID
		 */
		unselectData: function(dataId) {
			this._dipatchChangeDataSelectEvent();
			var hasChange = this._dataSelector.unselect(dataId);
			if (hasChange) {
				this._dipatchChangeDataSelectEvent();
			}
		},

		/**
		 * すべてのデータの選択を解除します。
		 */
		unselectDataAll: function() {
			var hasChange = this._dataSelector.unselectAll();
			if (hasChange) {
				this._dipatchChangeDataSelectEvent();
			}
		},

		/**
		 * 指定されたデータが選択されているか返します。
		 *
		 * @param dataId 選択されているか調べるデータのID
		 * @returns {boolean} 選択されていれば true、そうでなければ false
		 */
		isSelectedData: function(dataId) {
			return this._dataSelector.isSelected(dataId);
		},

		isSelectedDataAll: function() {
			return this._dataSelector.isSelectedAll();
		},

		getSelectedDataIdAll: function() {
			var dataIdAll = this._dataSearcher.getDataIdAll();
			return this._dataSelector.getSelectedAll(dataIdAll);
		},

		getDataSelectResult: function() {
			return this._dataSelector.getDataSelectResult();
		},

		focusData: function(dataId) {
			var hasChange = this._dataFocus.select(dataId);
			if (hasChange) {
				this._dispatchChangeDataFocusEvent();
			}
		},

		resetDataFocus: function() {
			var hasChange = this._dataFocus.unselectAll();
			if (hasChange) {
				this._dispatchChangeDataFocusEvent();
			}
		},

		getFocusedDataId: function() {
			var selected = this._dataFocus.getSelectedAll();
			return selected.length === 0 ? null : selected[0];
		},


		focusCell: function(row, column) {
			if (row < 0 || this.getTotalRows() <= row) {
				throw error.IndexOutOfBounds.createError(row);
			}
			if (column < 0 || this.getTotalColumns() <= column) {
				throw error.IndexOutOfBounds.createError(column);
			}
			this._cellSelector.focus(row, column);
		},

		isSelectingRange: function() {
			return this._cellSelector.isSelecting();
		},

		selectRange: function(rowIndex, rowLength, columnIndex, columnLength) {
			if (rowIndex < 0) {
				throw error.IndexOutOfBounds.createError(rowIndex);
			}
			if (columnIndex < 0) {
				throw error.IndexOutOfBounds.createError(columnIndex);
			}

			var rowLast = rowIndex + rowLength - 1;
			if (this.getTotalRows() <= rowLast) {
				throw error.IndexOutOfBounds.createError(rowLast);
			}
			var columnLast = columnIndex + columnLength - 1;
			if (this.getTotalColumns() <= columnLast) {
				throw error.IndexOutOfBounds.createError(columnLast);
			}

			this._cellSelector.selectRange(rowIndex, rowLength, columnIndex, columnLength);
		},

		selectRangeStart: function(row, column) {
			this._cellSelector.selectStart(row, column);
		},

		selectRangeMove: function(row, column) {
			this._cellSelector.selectMove(row, column);
		},

		selectRangeEnd: function() {
			this._cellSelector.selectEnd();
		},

		selectRangeAll: function() {
			var focusedCell = this.getFocusedCell();
			if ($.isEmptyObject(focusedCell)) {
				this.focusCell(0, 0);
			}

			var rows = this.getTotalRows();
			var columns = this.getTotalColumns();

			this._cellSelector.selectRange(0, rows, 0, columns);
		},

		selectRangeUp: function() {
			var focus = this.getFocusedCell();
			var range = this.getSelectedRange();

			var rowIndex = range.rowIndex;
			var rowLength = range.rowLength;
			var columnIndex = range.columnIndex;
			var columnLength = range.columnLength;

			var result;

			if (focus.row === range.rowIndex && 1 < range.rowLength) {
				// フォーカスの下を範囲選択時
				rowLength -= 1;
				result = rowIndex + rowLength - 1;
			} else if (0 < rowIndex) {
				// フォーカスの上を範囲選択時
				rowIndex -= 1;
				rowLength += 1;
				result = rowIndex;
			}

			this._cellSelector.selectRange(rowIndex, rowLength, columnIndex, columnLength);

			return result;
		},

		selectRangeDown: function() {
			var focus = this.getFocusedCell();
			var range = this.getSelectedRange();

			var rowIndex = range.rowIndex;
			var rowLength = range.rowLength;
			var columnIndex = range.columnIndex;
			var columnLength = range.columnLength;

			var totalRows = this.getTotalRows();

			var result;

			if (range.rowIndex < focus.row) {
				// フォーカスの上を範囲選択時
				rowIndex += 1;
				rowLength -= 1;
				result = rowIndex;
			} else if (rowIndex + rowLength < totalRows) {
				// フォーカスの下を範囲選択時
				rowLength += 1;
				result = rowIndex + rowLength - 1;
			}

			this._cellSelector.selectRange(rowIndex, rowLength, columnIndex, columnLength);

			return result;
		},

		selectRangeLeft: function() {
			var focus = this.getFocusedCell();
			var range = this.getSelectedRange();

			var rowIndex = range.rowIndex;
			var rowLength = range.rowLength;
			var columnIndex = range.columnIndex;
			var columnLength = range.columnLength;

			var result;

			if (focus.column === range.columnIndex && 1 < range.columnLength) {
				// フォーカスの右を範囲選択時
				columnLength -= 1;
				result = columnIndex + columnLength - 1;
			} else if (0 < columnIndex) {
				// フォーカスの左を範囲選択時
				columnIndex -= 1;
				columnLength += 1;
				result = columnIndex;
			}

			this._cellSelector.selectRange(rowIndex, rowLength, columnIndex, columnLength);

			return result;
		},

		selectRangeRight: function() {
			var focus = this.getFocusedCell();
			var range = this.getSelectedRange();

			var rowIndex = range.rowIndex;
			var rowLength = range.rowLength;
			var columnIndex = range.columnIndex;
			var columnLength = range.columnLength;

			var totalColumns = this.getTotalColumns();

			var result;

			if (range.columnIndex < focus.column) {
				// フォーカスの左を範囲選択時
				columnIndex += 1;
				columnLength -= 1;
				result = columnIndex;
			} else if (columnIndex + columnLength < totalColumns) {
				// フォーカスの右を範囲選択時
				columnLength += 1;
				result = columnIndex + columnLength - 1;
			}

			this._cellSelector.selectRange(rowIndex, rowLength, columnIndex, columnLength);

			return result;
		},

		resetCellSelect: function() {
			this._cellSelector.reset();
		},

		getFocusedCell: function() {
			return this._cellSelector.getFocusedCell();
		},

		getSelectedRange: function() {
			return this._cellSelector.getSelectedRange();
		},

		getSelectedRangeCopyText: function() {
			var selectedRange = this.getSelectedRange();
			if (selectedRange == null) {
				return '';
			}

			var request = this.request({
				selected: selectedRange
			});

			var gridRange = request.getRangeSet().selected;
			return gridRange.getCopyText();
		},


		canSetRowHeight: function() {
			return this._dataMapper.canSetRowHeight();
		},

		getRowHeightMin: function() {
			return this._dataMapper.getRowHeightMin();
		},

		getRowHeightMax: function() {
			return this._dataMapper.getRowHeightMax();
		},

		setRowHeight: function(row, height) {
			this._dataMapper.setRowHeight(row, height);
		},

		canSetColumnWidth: function() {
			return this._dataMapper.canSetColumnWidth();
		},

		getColumnWidthMin: function() {
			return this._dataMapper.getColumnWidthMin();
		},

		getColumnWidthMax: function() {
			return this._dataMapper.getColumnWidthMax();
		},

		setColumnWidth: function(column, width) {
			this._dataMapper.setColumnWidth(column, width);
		},

		/**
		 * データを取得するためのリクエストを行います。
		 *
		 * @param {GridRequestParam} requestParam リクエストのパラメータ
		 * @returns {GridRequest} リクエスト
		 */
		request: function(requestParam) {
			return this._dataMapper.request(requestParam);
		},

		/**
		 * 参照しているデータを取得します。
		 * <p>
		 * このメソッドは同期的に実行され、遅延ロードで読み込まれていないデータは isLoaded が false となりデータが null となります。
		 * </p>
		 *
		 * @returns {Array.<DataReference>} データへの参照の配列
		 */
		getDataReferences: function() {
			var count = this.getDataCount();
			var range = {
				index: 0,
				length: count
			};

			return this._dataSearcher.getReference(range).getDataReferences();
		},

		findData: function(dataId) {
			return this._dataSearcher.findData(dataId);
		},

		getGridCell: function(row, column) {
			var requestParam = {
				cell: {
					rowIndex: row,
					rowLength: 1,
					columnIndex: column,
					columnLength: 1
				}
			};

			var request = this._dataMapper.request(requestParam);
			var range = request.getRangeSet().cell;
			return range.getCell(0, 0);
		},

		// --- Private Property --- //

		/**
		 * @private
		 * @type {DataSource}
		 */
		_dataSource: null,

		/**
		 * @private
		 * @type {DataSearcher}
		 */
		_dataSearcher: null,

		/**
		 * @private
		 * @type {DataMapper}
		 */
		_dataMapper: null,

		/**
		 * @private
		 * @type {SingleDataSelector}
		 */
		_dataFocus: null,

		/**
		 * @private
		 * @type {DataSelector}
		 */
		_dataSelector: null,

		/**
		 * @private
		 * @type {CellSelector}
		 */
		_cellSelector: null,

		/**
		 * @private
		 * @type {CellSizeSet}
		 */
		_scrollRowHeightSet: null,

		/**
		 * @private
		 * @type {CellSizeSet}
		 */
		_scrollColumnWidthSet: null,

		/**
		 * @private
		 * @type {ScrollCalculator}
		 */
		_verticalScrollCalculator: null,

		/**
		 * @private
		 * @type {ScrollCalculator}
		 */
		_horizontalScrollCalculator: null,

		/**
		 * @private
		 * @type {Throttle}
		 */
		_changeEventThrottle: null,

		/**
		 * @private
		 * @type {EventListenerSet}
		 */
		_listenerSet: null,


		// --- Private Method --- //

		_dispatchChangeDataFocusEvent: function() {
			this._changeEventThrottle.call({
				type: 'changeDataFocus'
			});
		},

		_dipatchChangeDataSelectEvent: function() {
			this._changeEventThrottle.call({
				type: 'changeDataSelect'
			});
		}
	};


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	var exports = {

		SELECTED_BORDER_WIDTH: SELECTED_BORDER_WIDTH,

		// --- Private Class --- //

		// テスト用にクラスを公開
		// TODO: ビルドでテスト以外では公開しないようにするか検討
		_privateClass: {
			SingleDataSelector: SingleDataSelector,
			MultiDataSelector: MultiDataSelector,
			CellSelector: CellSelector,
			SizeHolder: SizeHolder,
			SingleValueCellSizeSet: SingleValueCellSizeSet,
			ArrayCellSizeSet: ArrayCellSizeSet,
			IndexScrollCalculator: IndexScrollCalculator,
			PixelScrollCalculator: PixelScrollCalculator,
			GridPropertyHierarchy: GridPropertyHierarchy,
			PropertyGridDataMapper: PropertyGridDataMapper
		}
	};


	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);
	h5.core.expose(gridLogicDefinition);

})();

/* ----- h5.ui.components.datagrid.view.dom ----- */
(function() {
	/* jshint loopfunc: true */

	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid.view.dom';

	/**
	 * @name dom
	 * @memberOf h5.ui.components.datagrid.view
	 * @namespace
	 */
	h5.u.obj.ns(NAMESPACE);


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// --- Scroll Bar --- //

	var SCROLL_BAR_WIDTH = 17;
	var SCROLL_BAR_BASE_CLASS = 'scrollBar';
	var SCROLL_BAR_ARROW_CLASS = 'scrollBarArrow';
	var SCROLL_BAR_ARROW_ICON_CLASS = 'scrollBarArrowIcon';
	var SCROLL_BAR_SCROLL_AREA_CLASS = 'scrollBarScrollArea';
	var SCROLL_BAR_KNOB_CLASS = 'scrollBarKnob';
	var SCROLL_BAR_KNOB_MIN_SIZE = 10;
	var SCROLL_BAR_REPEAT_FIRST_WAIT = 400;
	var SCROLL_BAR_REPEAT_INTERVAL = 50;
	var SCROLL_BAR_TRACK_KNOB_WAIT = 50;
	var SCROLL_BAR_PRESS_SCROLL_AREA_DIFF = 120;
	var SCROLL_EVENT_NAME = 'h5scroll';


	// --- Scroll Box --- //

	var VIRTUAL_SCROLL_BOX_RENDER_TARGET_CLASS = 'virtualScrollBoxRenderTarget';
	var VIRTUAL_SCROLL_BOX_LOADING_CLASS = 'virtualScrollBoxLoading';


	// --- ResizeColumnUI --- //

	var RESIZE_COLUMN_MARKER_CLASS = 'gridResizeColumnMarker';
	var RESIZE_COLUMN_PREVIEW_CLASS = 'gridResizeColumnPreview';

	var RESIZE_COLUMN_MARKER_WIDTH = 4;
	var RESIZE_COLUMN_PREVIEW_WIDTH = 2;

	var RESIZE_COLUMN_MARKER_HTML = (function() {
		var html = '<div';
		html += ' class="' + RESIZE_COLUMN_MARKER_CLASS + '"';
		html += ' style="';
		html += 'position: absolute;';
		html += ' top: 0;';
		html += ' right: 0;';
		html += ' width: ' + RESIZE_COLUMN_MARKER_WIDTH + 'px;';
		html += ' height: 100%;';
		html += '"></div>';

		return html;
	})();


	// --- ColumnSortAndFilterUI --- //

	var COLUMN_SORT_AND_FILTER_OVERLAY_ID = 'gridSortAndFilterOverlay';
	var COLUMN_SORT_AND_FILTER_MENU_CLASS = 'gridSortAndFilterMenu';
	var COLUMN_SORT_AND_FILTER_OWNER_DATA_NAME = 'gridSortAndFilterMenuOwnerController';
	var COLUMN_SORT_AND_FILTER_SORT_PROPERTY_DATA_NAME = 'gridSortProperty';


	// --- Table Grid View  --- //

	var VERTICAL_SCROLL_BAR_CLASS = 'gridVerticalScrollBar';
	var HORIZONTAL_SCROLL_BAR_CLASS = 'gridHorizontalScrollBar';

	var HEADER_TOP_LEFT_BOX_CLASS = 'gridHeaderTopLeftBox';
	var HEADER_ROWS_BOX_CLASS = 'gridHeaderRowsBox';
	var HEADER_COLUMNS_BOX_CLASS = 'gridHeaderColumnsBox';
	var MAIN_BOX_CLASS = 'gridMainBox';
	var COPY_TARGET_CLASS = 'gridCopyTarget';
	var CELL_FRAME_CLASS = 'gridCellFrame';

	var FETCH_WAIT_TIME = 100;
	var KEYDOWN_WAIT_TIME = 50;

	var SELECT_RANGE_SCROLL_MARGIN = 50;
	var SELECT_RANGE_SCROLL_PIXEL = 20;
	var SELECT_RANGE_SCROLL_WAIT_TIME = 200;


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var datagrid = h5.ui.components.datagrid;
	var util = datagrid.util;
	var type = datagrid.type;

	var escapeHtml = h5.u.str.escapeHtml;
	var format = h5.u.str.format;


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Function
	//=============================

	// TODO: ejs 化
	function createTableRenderer(param) {
		/* jshint maxcomplexity: false */

		var defaultFormatter = param.defaultFormatter;
		var formatterSet = param.formatterSet;
		var sortSet = param.sortSet;
		var filterSet = param.filterSet;
		var cellClassDefinition = param.cellClassDefinition;
		var disableInput = param.disableInput;
		var resizeColumnUI = param.resizeColumnUI;
		var columnSortAndFilterUI = param.columnSortAndFilterUI;

		return function($target, gridRange) {
			var tableWidth = gridRange.getRangeWidth();
			var tableTop = gridRange.getTop();
			var tableLeft = gridRange.getLeft();

			var html = '<table style="table-layout: fixed; border-collapse: collapse; border-style: none;';
			html += ' position: relative;';
			html += ' width: ' + tableWidth + 'px;';
			html += ' top: ' + tableTop + 'px;';
			html += ' left: ' + tableLeft + 'px;';
			html += '">';

			var rowLength = gridRange.getRowLength();
			var columnLength = gridRange.getColumnLength();

			html += '<colgroup>';



			var i, j;
			for (j = 0; j < columnLength; j++) {
				var colWidth = gridRange.getColumnWidth(j);
				html += '<col style="width: ' + colWidth + 'px">';
			}

			html += '</colgroup>';

			for (i = 0; i < rowLength; i++) {
				var height = gridRange.getRowHeight(i);

				html += '<tr style="height:' + height + 'px;">';

				for (j = 0; j < columnLength; j++) {
					var cell = gridRange.getCell(i, j);
					var width = gridRange.getColumnWidth(j);

					var isFirstRow = cell.row === 0;
					var isFirstColumn = cell.column === 0;
					var isLastRow = cell.row === gridRange.getAllRows() - 1;
					var isLastColumn = cell.column === gridRange.getAllColumns() - 1;

					var topBorder = gridRange.getTopBorder(i, j);
					var leftBorder = gridRange.getLeftBorder(i, j);
					var bottomBorder = gridRange.getBottomBorder(i, j);
					var rightBorder = gridRange.getRightBorder(i, j);

					// TODO: border 幅を view 側の設定に寄せる（クラス化はロジック、幅決めはビュー）

					var topBorderWidth = Math.floor(topBorder.width / 2);
					var leftBorderWidth = Math.floor(leftBorder.width / 2);
					var bottomBorderWidth = Math.ceil(bottomBorder.width / 2);
					var rightBorderWidth = Math.ceil(rightBorder.width / 2);

					if (isFirstRow) {
						topBorderWidth = topBorder.width;
					}
					if (isFirstColumn) {
						leftBorderWidth = leftBorder.width;
					}
					if (isLastRow) {
						bottomBorderWidth = bottomBorder.width;
					}
					if (isLastColumn) {
						rightBorderWidth = rightBorder.width;
					}


					// FIXME
					var divTop = 0;
					var divLeft = 0;
					var divHeight = height;
					var divWidth = width;

					html += '<td style="padding: 0; border-width: 0; overflow: hidden;">';

					html += '<div style="';
					html += 'position: relative;';
					html += ' height: ' + height + 'px;';
					html += ' width: ' + width + 'px;';
					html += ' overflow: hidden;';
					html += '" class="';

					// Eclipse の警告回避のため宣言と代入を分割
					var classes;
					classes = [CELL_FRAME_CLASS];

					if (cell.isFocusedData) {
						classes.push('gridFocusedData');
					}
					if (cell.isSelectedData) {
						classes.push('gridSelectedData');
					}
					if (cell.isFocusedCell) {
						classes.push('gridFocusedCell');
					}
					if (cell.isSelectedCell) {
						classes.push('gridSelectedCell');
					}
					if (cell.isHeaderRow) {
						classes.push('gridHeaderRow');
					}
					if (cell.isHeaderColumn) {
						classes.push('gridHeaderColumn');
					}
					if (cell.isPropertyHeader) {
						classes.push('gridPropertyHeader');
					}


					var disabled = false;
					if (disableInput != null) {
						disabled = disableInput(cell);
					}

					util.forEach(cellClassDefinition, function(predicate, className) {
						if (predicate(cell, disabled)) {
							classes.push(escapeHtml(className));
						}
					});

					html += classes.join(' ');


					html += '"';

					var dataIdStr = escapeHtml(cell.dataId);
					var propertyNameStr = escapeHtml(cell.propertyName);

					html += ' data-h5-dyn-grid-row="' + cell.row + '"';
					html += ' data-h5-dyn-grid-column="' + cell.column + '"';
					if (cell.dataId != null) {
						html += ' data-h5-dyn-grid-data-id="' + dataIdStr + '"';
					}
					html += ' data-h5-dyn-grid-property-name="' + propertyNameStr + '"';
					html += '>';


					html += '<div class="gridCell" style="overflow: hidden; position: absolute;';
					html += ' top:' + divTop + 'px;';
					html += ' left:' + divLeft + 'px;';
					html += ' height:' + divHeight + 'px;';
					html += ' width:' + divWidth + 'px;';


					html += '">';

					var formatter = formatterSet[cell.propertyName];
					if (formatter == null) {
						formatter = defaultFormatter;
					}

					html += formatter(cell, disabled, divHeight, divWidth);

					// sortAndFilter ボタン の追加
					if (cell.isHeaderRow && cell.isPropertyHeader) {
						var sortSetting = sortSet[cell.propertyName];
						var filterSetting = filterSet[cell.propertyName];

						var sortEnable = sortSetting != null && sortSetting.enable;
						var filterEnable = filterSetting != null && filterSetting.enable;

						if (sortEnable || filterEnable) {
							html += columnSortAndFilterUI.makeButtonHtml();
						}
					}

					html += '</div>';


					// border の追加

					if (0 < topBorderWidth) {
						html += '<div class="gridBorder gridHorizontalBorder gridTopBorder';
						util.forEach(topBorder.classes, function(cls) {
							html += ' ';
							html += cls;
						});

						html += '" style="';
						html += ' position: absolute;';
						html += ' top: 0;';
						html += ' left: 0;';
						html += ' height: ' + topBorderWidth + 'px;';
						html += ' width: ' + width + 'px;';
						html += '"></div>';
					}

					if (0 < leftBorderWidth) {
						html += '<div class="gridBorder gridVerticalBorder gridLeftBorder';
						util.forEach(leftBorder.classes, function(cls) {
							html += ' ';
							html += cls;
						});

						html += '" style="';
						html += ' position: absolute;';
						html += ' top: 0;';
						html += ' left: 0;';
						html += ' height: ' + height + 'px;';
						html += ' width: ' + leftBorderWidth + 'px;';
						html += '"></div>';
					}


					if (0 < bottomBorderWidth) {
						html += '<div class="gridBorder gridHorizontalBorder gridBottomBorder';
						util.forEach(bottomBorder.classes, function(cls) {
							html += ' ';
							html += cls;
						});

						html += '" style="';
						html += ' position: absolute;';
						html += ' bottom: 0;';
						html += ' left: 0;';
						html += ' height: ' + bottomBorderWidth + 'px;';
						html += ' width: ' + width + 'px;';
						html += '"></div>';
					}

					if (0 < rightBorderWidth) {
						html += '<div class="gridBorder gridVerticalBorder gridRightBorder';
						util.forEach(rightBorder.classes, function(cls) {
							html += ' ';
							html += cls;
						});

						html += '" style="';
						html += ' position: absolute;';
						html += ' top: 0;';
						html += ' right: 0;';
						html += ' height: ' + height + 'px;';
						html += ' width: ' + rightBorderWidth + 'px;';
						html += '"></div>';
					}


					// resizeColumnMarker の追加
					if (cell.isHeaderRow && cell.enableResize) {
						html += resizeColumnUI.makeResizeMarkerHtml(height);
					}


					html += '</div>';
					html += '</td>';
				}

				html += '</tr>';
			}

			html += '</table>';

			$target[0].innerHTML = html;
		};
	}


	//=============================
	// Variable
	//=============================

	// =========================================================================
	//
	// Controllers
	//
	// =========================================================================

	//=============================
	// ScrollBarController
	//=============================

	var verticalScrollBarController = {

		// --- Metadata --- //

		/**
		 * @memberOf VerticalScrollBarController
		 */
		__name: 'h5.ui.components.datagrid.view.dom.VerticalScrollBarController',


		// --- Life Cycle Method --- //

		__construct: function() {
			var firstWait = SCROLL_BAR_REPEAT_FIRST_WAIT;
			var interval = SCROLL_BAR_REPEAT_INTERVAL;

			var pressArrow = this.own(function(diff) {
				this.trigger(SCROLL_EVENT_NAME, {
					vertical: {
						type: 'indexDiff',
						diff: diff
					}
				});
			});

			this._pressArrowRepeat = util.createRepeat(firstWait, interval, pressArrow);

			var pressAreaUp = this.own(function() {
				if (this._realPosition < this._areaTrackPos) {
					return;
				}

				// TODO: index ベースのとき移動幅が大きくなりすぎる
				var position = this._position - SCROLL_BAR_PRESS_SCROLL_AREA_DIFF;
				this._moveKnob(position);

				this.trigger(SCROLL_EVENT_NAME, {
					vertical: {
						type: 'scrollPosition',
						position: position
					}
				});
			});

			var pressAreaDown = this.own(function() {
				var knobBottom = this._realPosition + this._knobSize;
				if (this._areaTrackPos < knobBottom) {
					return;
				}

				// TODO: index ベースのとき移動幅が大きくなりすぎる
				var position = this._position + SCROLL_BAR_PRESS_SCROLL_AREA_DIFF;
				this._moveKnob(position);

				this.trigger(SCROLL_EVENT_NAME, {
					vertical: {
						type: 'scrollPosition',
						position: position
					}
				});
			});

			this._pressScrollAreaUpRepeat = util.createRepeat(firstWait, interval, pressAreaUp);
			this._pressScrollAreaDownRepeat = util.createRepeat(firstWait, interval, pressAreaDown);


			var trackKnob = this.own(function(position) {
				this.trigger(SCROLL_EVENT_NAME, {
					vertical: {
						type: 'scrollPosition',
						position: position
					}
				});
			});

			this._trackKnobThrottle = util.createThrottle(SCROLL_BAR_TRACK_KNOB_WAIT, trackKnob, {
				deferFirst: false,
				deferInWaiting: false
			});
		},

		__init: function() {

			var $root = $(this.rootElement);

			var rootPosition = $root.css('position');

			if (rootPosition === 'static') {
				rootPosition = 'relative';
			}

			$root.css({
				overflow: 'hidden',
				position: rootPosition,
				width: SCROLL_BAR_WIDTH,
				visibility: 'hidden'
			});

			var $scrollBar = $('<div></div>');
			$scrollBar.addClass(SCROLL_BAR_BASE_CLASS);
			$scrollBar.css({
				position: 'absolute',
				top: 0,
				left: 0,
				width: SCROLL_BAR_WIDTH,
				overflow: 'hidden'
			});
			$root.append($scrollBar);


			var $scrollArea = $('<div></div>');
			$scrollArea.addClass(SCROLL_BAR_SCROLL_AREA_CLASS);
			$scrollArea.css({
				position: 'absolute',
				top: SCROLL_BAR_WIDTH,
				left: 0,
				width: SCROLL_BAR_WIDTH
			});
			$scrollBar.append($scrollArea);

			var $knob = $('<div></div>');
			$knob.addClass(SCROLL_BAR_KNOB_CLASS);
			$knob.css({
				position: 'absolute',
				left: 2,
				width: SCROLL_BAR_WIDTH - 4,
				'border-radius': 2
			});
			$scrollArea.append($knob);

			var $upArrow = $('<div></div>');
			$upArrow.addClass(SCROLL_BAR_ARROW_CLASS);
			$upArrow.addClass(SCROLL_BAR_ARROW_CLASS + 'Up');
			$upArrow.css({
				position: 'absolute',
				top: 0,
				left: 0,
				height: SCROLL_BAR_WIDTH,
				width: SCROLL_BAR_WIDTH
			});
			$scrollBar.append($upArrow);

			var $upIcon = $('<div></div>');
			$upIcon.addClass(SCROLL_BAR_ARROW_ICON_CLASS);
			$upIcon.addClass(SCROLL_BAR_ARROW_ICON_CLASS + 'Up');
			$upIcon.css({
				position: 'absolute',
				top: 0,
				left: 2,
				height: 0,
				width: 0,
				'border-style': 'solid',
				'border-width': 6,
				'border-top-color': 'transparent',
				'border-left-color': 'transparent',
				'border-right-color': 'transparent'
			});
			$upArrow.append($upIcon);

			var $downArrow = $('<div></div>');
			$downArrow.addClass(SCROLL_BAR_ARROW_CLASS);
			$downArrow.addClass(SCROLL_BAR_ARROW_CLASS + 'Down');
			$downArrow.css({
				position: 'absolute',
				bottom: 0,
				left: 0,
				height: SCROLL_BAR_WIDTH,
				width: SCROLL_BAR_WIDTH
			});
			$scrollBar.append($downArrow);

			var $downIcon = $('<div></div>');
			$downIcon.addClass(SCROLL_BAR_ARROW_ICON_CLASS);
			$downIcon.addClass(SCROLL_BAR_ARROW_ICON_CLASS + 'Down');
			$downIcon.css({
				position: 'absolute',
				top: 6,
				left: 2,
				height: 0,
				width: 0,
				'border-style': 'solid',
				'border-width': 6,
				'border-bottom-color': 'transparent',
				'border-left-color': 'transparent',
				'border-right-color': 'transparent'
			});
			$downArrow.append($downIcon);


			this._barSize = $root.height();
			this._resizeScrollSize();
		},

		__unbind: function() {
			this._pressArrowRepeat.dispose();
			this._pressScrollAreaUpRepeat.dispose();
			this._pressScrollAreaDownRepeat.dispose();
			this._trackKnobThrottle.dispose();

			$(this.rootElement).empty();
		},


		// --- Public Method --- //

		setScrollSize: function(displaySize, scrollSize) {
			this._displaySize = displaySize;
			this._scrollSize = scrollSize;

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		setBarSize: function(size) {
			$(this.rootElement).css({
				height: size
			});

			var minSize = SCROLL_BAR_WIDTH * 2 + SCROLL_BAR_KNOB_MIN_SIZE + 2;
			var _size = size;
			if (_size < minSize) {
				_size = minSize;
			}


			this._barSize = _size;
			this.$find('.' + SCROLL_BAR_BASE_CLASS).css({
				height: _size
			});
			this.$find('.' + SCROLL_BAR_SCROLL_AREA_CLASS).css({
				height: _size - SCROLL_BAR_WIDTH * 2
			});

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		getScrollSize: function() {
			return this._scrollSize;
		},

		setScrollPosition: function(position) {
			this._moveKnob(position);
		},

		getScrollPosition: function() {
			return this._position;
		},


		// --- Event Handler --- //

		'.scrollBarArrowUp h5trackstart': function(context, $el) {
			if ($el.hasClass('disabled')) {
				return;
			}

			$el.addClass('pressed');
			this._pressArrowRepeat.start(-1);
		},

		'.scrollBarArrowUp h5trackend': function(context, $el) {
			$el.removeClass('pressed');
			this._pressArrowRepeat.stop();
		},

		'.scrollBarArrowDown h5trackstart': function(context, $el) {
			if ($el.hasClass('disabled')) {
				return;
			}

			$el.addClass('pressed');
			this._pressArrowRepeat.start(1);
		},

		'.scrollBarArrowDown h5trackend': function(context, $el) {
			$el.removeClass('pressed');
			this._pressArrowRepeat.stop();
		},


		'.scrollBarKnob h5trackstart': function(context, $el) {
			var event = context.event;
			event.stopPropagation();

			var $root = $(this.rootElement);
			var pageY = event.pageY;

			this._knobPosMin = $root.offset().top + SCROLL_BAR_WIDTH;
			this._knobPosDiff = pageY - $el.offset().top;

			$el.addClass('tracking');
		},

		'.scrollBarKnob h5trackmove': function(context) {
			var pageY = context.event.pageY;
			var knobPos = pageY - this._knobPosDiff;

			var posMin = this._knobPosMin;
			var posMax = posMin + this._realScrollSize;

			if (knobPos < posMin) {
				knobPos = posMin;
			} else if (posMax < knobPos) {
				knobPos = posMax;
			}

			var scrollPos = (knobPos - posMin) * (this._scrollSize / this._realScrollSize);
			scrollPos = Math.floor(scrollPos);
			this._moveKnob(scrollPos);

			this._trackKnobThrottle.call(scrollPos);
		},

		'.scrollBarKnob h5trackend': function(context, $el) {
			this._knobPosMin = null;
			this._knobPosDiff = null;

			$el.removeClass('tracking');
		},


		'.scrollBarScrollArea h5trackstart': function(context, $el) {
			this._areaTop = $el.offset().top;
			this._areaTrackPos = context.event.pageY - this._areaTop;

			if (this._areaTrackPos < this._realPosition) {
				this._pressScrollAreaUpRepeat.start();
			} else {
				this._pressScrollAreaDownRepeat.start();
			}
		},

		'.scrollBarScrollArea h5trackmove': function(context) {
			this._areaTrackPos = context.event.pageY - this._areaTop;
		},

		'.scrollBarScrollArea h5trackend': function() {
			this._areaTop = null;
			this._areaTrackPos = null;

			this._pressScrollAreaUpRepeat.stop();
			this._pressScrollAreaDownRepeat.stop();
		},


		// --- Private Property --- //

		_displaySize: 0,

		_scrollSize: 1,

		_barSize: 0,


		_position: 0,

		_realPosition: 0,

		_realScrollSize: 0,


		_knobSize: 0,

		_knobPosMin: null,

		_knobPosDiff: null,

		_areaTop: null,

		_areaTrackPos: null,


		_trackKnobThrottle: null,

		_pressArrowRepeat: null,

		_pressScrollAreaUpRepeat: null,

		_pressScrollAreaDownRepeat: null,


		// --- Private Method --- //

		_moveKnob: function(position) {
			this._position = position;

			var realPosition = Math.floor(position * (this._realScrollSize / this._scrollSize));
			this._realPosition = realPosition;

			this.$find('.' + SCROLL_BAR_KNOB_CLASS).css({
				top: realPosition
			});


			// 端だったら disable のクラスをあてる
			var disabledClass = 'disabled';
			this.$find('.' + SCROLL_BAR_ARROW_CLASS).removeClass(disabledClass);
			if (position === 0) {
				this.$find('.' + SCROLL_BAR_ARROW_CLASS + 'Up').addClass(disabledClass);
			}
			if (this._scrollSize - 1 <= position) {
				this.$find('.' + SCROLL_BAR_ARROW_CLASS + 'Down').addClass(disabledClass);
			}
		},

		_resizeScrollSize: function() {
			var realSize = this._barSize - SCROLL_BAR_WIDTH * 2;
			var virtualSize = this._displaySize + this._scrollSize;
			var knobSize = Math.floor(this._displaySize * (realSize / virtualSize));
			if (knobSize < SCROLL_BAR_KNOB_MIN_SIZE) {
				knobSize = SCROLL_BAR_KNOB_MIN_SIZE;
			}

			this._knobSize = knobSize;
			this._realScrollSize = realSize - knobSize;

			var $knob = this.$find('.' + SCROLL_BAR_KNOB_CLASS);
			$knob.css({
				height: knobSize
			});

			var $root = $(this.rootElement);
			var visibility = (this._scrollSize <= 1) ? 'hidden' : 'visible';

			$root.css({
				visibility: visibility
			});

			this._moveKnob(this._position);
		}
	};


	var horizontalScrollBarController = {

		// --- Metadata --- //

		/**
		 * @memberOf HorizontalScrollBarController
		 */
		__name: 'h5.ui.components.datagrid.view.dom.HorizontalScrollBarController',


		// --- Life Cycle Method --- //

		__construct: function() {
			var firstWait = SCROLL_BAR_REPEAT_FIRST_WAIT;
			var interval = SCROLL_BAR_REPEAT_INTERVAL;

			var pressArrow = this.own(function(diff) {
				this.trigger(SCROLL_EVENT_NAME, {
					horizontal: {
						type: 'indexDiff',
						diff: diff
					}
				});
			});

			this._pressArrowRepeat = util.createRepeat(firstWait, interval, pressArrow);

			var pressAreaLeft = this.own(function() {
				if (this._realPosition < this._areaTrackPos) {
					return;
				}

				// TODO: index ベースのとき移動幅が大きくなりすぎる
				var position = this._position - SCROLL_BAR_PRESS_SCROLL_AREA_DIFF;
				this._moveKnob(position);

				this.trigger(SCROLL_EVENT_NAME, {
					horizontal: {
						type: 'scrollPosition',
						position: position
					}
				});
			});

			var pressAreaRight = this.own(function() {
				var knobBottom = this._realPosition + this._knobSize;
				if (this._areaTrackPos < knobBottom) {
					return;
				}

				// TODO: index ベースのとき移動幅が大きくなりすぎる
				var position = this._position + SCROLL_BAR_PRESS_SCROLL_AREA_DIFF;
				this._moveKnob(position);

				this.trigger(SCROLL_EVENT_NAME, {
					horizontal: {
						type: 'scrollPosition',
						position: position
					}
				});
			});

			this._pressScrollAreaLeftRepeat = util.createRepeat(firstWait, interval, pressAreaLeft);
			this._pressScrollAreaRightRepeat = util.createRepeat(firstWait, interval,
					pressAreaRight);


			var trackKnob = this.own(function(position) {
				this.trigger(SCROLL_EVENT_NAME, {
					horizontal: {
						type: 'scrollPosition',
						position: position
					}
				});
			});

			this._trackKnobThrottle = util.createThrottle(SCROLL_BAR_TRACK_KNOB_WAIT, trackKnob, {
				deferFirst: false,
				deferInWaiting: false
			});
		},

		__init: function() {

			var $root = $(this.rootElement);

			var rootPosition = $root.css('position');

			if (rootPosition === 'static') {
				rootPosition = 'relative';
			}

			$root.css({
				overflow: 'hidden',
				position: rootPosition,
				height: SCROLL_BAR_WIDTH,
				visibility: 'hidden'
			});

			var $scrollBar = $('<div></div>');
			$scrollBar.addClass(SCROLL_BAR_BASE_CLASS);
			$scrollBar.css({
				position: 'absolute',
				top: 0,
				left: 0,
				height: SCROLL_BAR_WIDTH,
				overflow: 'hidden'
			});
			$root.append($scrollBar);


			var $scrollArea = $('<div></div>');
			$scrollArea.addClass(SCROLL_BAR_SCROLL_AREA_CLASS);
			$scrollArea.css({
				position: 'absolute',
				top: 0,
				left: SCROLL_BAR_WIDTH,
				height: SCROLL_BAR_WIDTH
			});
			$scrollBar.append($scrollArea);

			var $knob = $('<div></div>');
			$knob.addClass(SCROLL_BAR_KNOB_CLASS);
			$knob.css({
				position: 'absolute',
				top: 2,
				height: SCROLL_BAR_WIDTH - 4,
				'border-radius': 2
			});
			$scrollArea.append($knob);

			var $leftArrow = $('<div></div>');
			$leftArrow.addClass(SCROLL_BAR_ARROW_CLASS);
			$leftArrow.addClass(SCROLL_BAR_ARROW_CLASS + 'Left');
			$leftArrow.css({
				position: 'absolute',
				top: 0,
				left: 0,
				height: SCROLL_BAR_WIDTH,
				width: SCROLL_BAR_WIDTH
			});
			$scrollBar.append($leftArrow);

			var $leftIcon = $('<div></div>');
			$leftIcon.addClass(SCROLL_BAR_ARROW_ICON_CLASS);
			$leftIcon.addClass(SCROLL_BAR_ARROW_ICON_CLASS + 'Left');
			$leftIcon.css({
				position: 'absolute',
				top: 2,
				left: 0,
				height: 0,
				width: 0,
				'border-style': 'solid',
				'border-width': 6,
				'border-top-color': 'transparent',
				'border-bottom-color': 'transparent',
				'border-left-color': 'transparent'
			});
			$leftArrow.append($leftIcon);

			var $rightArrow = $('<div></div>');
			$rightArrow.addClass(SCROLL_BAR_ARROW_CLASS);
			$rightArrow.addClass(SCROLL_BAR_ARROW_CLASS + 'Right');
			$rightArrow.css({
				position: 'absolute',
				top: 0,
				right: 0,
				height: SCROLL_BAR_WIDTH,
				width: SCROLL_BAR_WIDTH
			});
			$scrollBar.append($rightArrow);

			var $rightIcon = $('<div></div>');
			$rightIcon.addClass(SCROLL_BAR_ARROW_ICON_CLASS);
			$rightIcon.addClass(SCROLL_BAR_ARROW_ICON_CLASS + 'Right');
			$rightIcon.css({
				position: 'absolute',
				top: 2,
				left: 6,
				height: 0,
				width: 0,
				'border-style': 'solid',
				'border-width': 6,
				'border-top-color': 'transparent',
				'border-bottom-color': 'transparent',
				'border-right-color': 'transparent'
			});
			$rightArrow.append($rightIcon);


			this._barSize = $root.width();
			this._resizeScrollSize();
		},

		__unbind: function() {
			this._pressArrowRepeat.dispose();
			this._pressScrollAreaLeftRepeat.dispose();
			this._pressScrollAreaRightRepeat.dispose();
			this._trackKnobThrottle.dispose();

			$(this.rootElement).empty();
		},


		// --- Public Method --- //

		setScrollSize: function(displaySize, scrollSize) {
			this._displaySize = displaySize;
			this._scrollSize = scrollSize;

			if (this.isInit) {
				this._resizeScrollSize();
			}
		},

		setBarSize: function(size) {
			$(this.rootElement).css({
				width: size
			});

			var minSize = SCROLL_BAR_WIDTH * 2 + SCROLL_BAR_KNOB_MIN_SIZE + 2;
			var _size = size;
			if (_size < minSize) {
				_size = minSize;
			}


			this._barSize = _size;
			this.$find('.' + SCROLL_BAR_BASE_CLASS).css({
				width: _size
			});
			this.$find('.' + SCROLL_BAR_SCROLL_AREA_CLASS).css({
				width: _size - SCROLL_BAR_WIDTH * 2
			});
		},

		getScrollSize: function() {
			return this._scrollSize;
		},

		setScrollPosition: function(position) {
			this._moveKnob(position);
		},

		getScrollPosition: function() {
			return this._position;
		},


		// --- Event Handler --- //

		'.scrollBarArrowLeft h5trackstart': function(context, $el) {
			if ($el.hasClass('disabled')) {
				return;
			}

			$el.addClass('pressed');
			this._pressArrowRepeat.start(-1);
		},

		'.scrollBarArrowLeft h5trackend': function(context, $el) {
			$el.removeClass('pressed');
			this._pressArrowRepeat.stop();
		},

		'.scrollBarArrowRight h5trackstart': function(context, $el) {
			if ($el.hasClass('disabled')) {
				return;
			}

			$el.addClass('pressed');
			this._pressArrowRepeat.start(1);
		},

		'.scrollBarArrowRight h5trackend': function(context, $el) {
			$el.removeClass('pressed');
			this._pressArrowRepeat.stop();
		},


		'.scrollBarKnob h5trackstart': function(context, $el) {
			var event = context.event;
			event.stopPropagation();

			var $root = $(this.rootElement);
			var pageX = event.pageX;

			this._knobPosMin = $root.offset().left + SCROLL_BAR_WIDTH;
			this._knobPosDiff = pageX - $el.offset().left;

			$el.addClass('tracking');
		},

		'.scrollBarKnob h5trackmove': function(context) {
			var pageX = context.event.pageX;
			var knobPos = pageX - this._knobPosDiff;

			var posMin = this._knobPosMin;
			var posMax = posMin + this._realScrollSize;

			if (knobPos < posMin) {
				knobPos = posMin;
			} else if (posMax < knobPos) {
				knobPos = posMax;
			}

			var scrollPos = (knobPos - posMin) * (this._scrollSize / this._realScrollSize);
			scrollPos = Math.floor(scrollPos);
			this._moveKnob(scrollPos);

			this._trackKnobThrottle.call(scrollPos);
		},

		'.scrollBarKnob h5trackend': function(context, $el) {
			this._knobPosMin = null;
			this._knobPosDiff = null;

			$el.removeClass('tracking');
		},


		'.scrollBarScrollArea h5trackstart': function(context, $el) {
			this._areaLeft = $el.offset().left;
			this._areaTrackPos = context.event.pageX - this._areaLeft;

			if (this._areaTrackPos < this._realPosition) {
				this._pressScrollAreaLeftRepeat.start();
			} else {
				this._pressScrollAreaRightRepeat.start();
			}
		},

		'.scrollBarScrollArea h5trackmove': function(context) {
			this._areaTrackPos = context.event.pageX - this._areaLeft;
		},

		'.scrollBarScrollArea h5trackend': function() {
			this._areaLeft = null;
			this._areaTrackPos = null;

			this._pressScrollAreaLeftRepeat.stop();
			this._pressScrollAreaRightRepeat.stop();
		},


		// --- Private Property --- //

		_displaySize: 0,

		_scrollSize: 1,

		_barSize: 0,


		_position: 0,

		_realPosition: 0,

		_realScrollSize: 0,


		_knobSize: 0,

		_knobPosMin: null,

		_knobPosDiff: null,

		_areaLeft: null,

		_areaTrackPos: null,


		_trackKnobThrottle: null,

		_pressArrowRepeat: null,

		_pressScrollAreaLeftRepeat: null,

		_pressScrollAreaRightRepeat: null,


		// --- Private Method --- //

		_moveKnob: function(position) {
			var _position = position;
			if (_position < 0) {
				_position = 0;
			} else if (this._scrollSize <= _position) {
				_position = this._scrollSize - 1;
			}
			this._position = _position;

			var realPosition = Math.floor(_position * (this._realScrollSize / this._scrollSize));
			this._realPosition = realPosition;

			this.$find('.' + SCROLL_BAR_KNOB_CLASS).css({
				left: realPosition
			});


			// 端だったら disable のクラスをあてる
			var disabledClass = 'disabled';
			this.$find('.' + SCROLL_BAR_ARROW_CLASS).removeClass(disabledClass);
			if (_position <= 0) {
				this.$find('.' + SCROLL_BAR_ARROW_CLASS + 'Left').addClass(disabledClass);
			}
			if (this._scrollSize - 1 <= _position) {
				this.$find('.' + SCROLL_BAR_ARROW_CLASS + 'Right').addClass(disabledClass);
			}
		},

		_resizeScrollSize: function() {
			var realSize = this._barSize - SCROLL_BAR_WIDTH * 2;
			var virtualSize = this._displaySize + this._scrollSize;
			var knobSize = Math.floor(this._displaySize * (realSize / virtualSize));
			if (knobSize < SCROLL_BAR_KNOB_MIN_SIZE) {
				knobSize = SCROLL_BAR_KNOB_MIN_SIZE;
			}

			this._knobSize = knobSize;
			this._realScrollSize = realSize - knobSize;

			var $knob = this.$find('.' + SCROLL_BAR_KNOB_CLASS);
			$knob.css({
				width: knobSize
			});

			var $root = $(this.rootElement);
			var visibility = (this._scrollSize <= 1) ? 'hidden' : 'visible';

			$root.css({
				visibility: visibility
			});

			this._moveKnob(this._position);
		}
	};


	//=============================
	// VirtualScrollBoxController
	//=============================

	var virtualScrollBoxController = {

		// --- Metadata --- //

		/**
		 * @memberOf VirtualScrollBoxController
		 */
		__name: 'h5.ui.components.datagrid.view.dom.VirtualScrollBoxController',


		// --- Life Cycle Method --- //

		__construct: function() {
			this._activateDeferred = this.deferred();
		},

		__init: function() {
			var $root = $(this.rootElement);

			var rootPosition = $root.css('position');

			if (rootPosition === 'static') {
				rootPosition = 'relative';
			}

			$root.css({
				overflow: 'hidden',
				position: rootPosition
			});

			$('<div></div>').addClass(VIRTUAL_SCROLL_BOX_RENDER_TARGET_CLASS).css({
				position: 'absolute'
			}).appendTo($root);

			$('<div></div>').addClass(VIRTUAL_SCROLL_BOX_LOADING_CLASS).css({
				position: 'absolute',
				top: 0,
				left: 0,
				display: 'none'
			}).appendTo($root);
		},

		__unbind: function() {
			var $root = $(this.rootElement);
			$root.empty();
		},


		// --- Event Handler --- //

		'{rootElement} [scroll]': function(context, $el) {
			// MEMO: セレクトボックスを開こうとしたときなどに overflow が hidden でもスクロールすることがある

			var vDiff = $el.scrollTop();
			var hDiff = $el.scrollLeft();

			$el.scrollTop(0);
			$el.scrollLeft(0);

			this.trigger(SCROLL_EVENT_NAME, {
				vertical: {
					type: 'scrollDiff',
					diff: vDiff
				},
				horizontal: {
					type: 'scrollDiff',
					diff: hDiff
				}
			});
		},


		// --- Public Method --- //

		activate: function(renderer) {
			this._renderer = renderer;

			return this.readyPromise.then(this.own(function() {
				this._activateDeferred.resolve();
			}));
		},

		setRenderer: function(renderer) {
			this._renderer = renderer;
		},

		render: function(renderData) {
			this._activateDeferred.then(this.own(function() {
				this._renderer(this._getRenderTarget(), renderData);
			}));
		},

		setVerticalPosition: function(position) {
			var $target = this._getRenderTarget();

			if (position === 'last') {
				$target.css({
					top: '',
					bottom: 0
				});
				return;
			}

			this._getRenderTarget().css({
				top: position,
				bottom: ''
			});
		},

		setHorizontalPosition: function(position) {
			var $target = this._getRenderTarget();

			if (position === 'last') {
				$target.css({
					left: '',
					right: 0
				});
				return;
			}

			this._getRenderTarget().css({
				left: position,
				right: ''
			});
		},


		getLoadingDiv: function() {
			return this._getLoading()[0];
		},

		beginLoad: function() {
			this._getRenderTarget().hide();
			this._getLoading().show();
		},

		endLoad: function() {
			this._getLoading().hide();
			this._getRenderTarget().show();
		},

		getActivatePromise: function() {
			return this._activateDeferred.promise();
		},

		/**
		 * 起動した状態であるか返します。
		 *
		 * @returns {boolean} 起動済みであれば true、そうでなければ false
		 */
		isActive: function() {
			return this._activateDeferred.state() === 'resolved';
		},


		// --- Private Property --- //

		_renderer: null,

		_activateDeferred: null,


		// --- Private Method --- //

		_getRenderTarget: function() {
			// 入れ子になる可能性もあるので children で取得する
			return $(this.rootElement).children('.' + VIRTUAL_SCROLL_BOX_RENDER_TARGET_CLASS);
		},

		_getLoading: function() {
			return $(this.rootElement).children('.' + VIRTUAL_SCROLL_BOX_LOADING_CLASS);
		}

	};


	//=============================
	// ResizeColumnUIController
	//=============================

	var resizeColumnUIController = {

		// --- Metadata --- //

		/**
		 * @memberOf ResizeColumnUIController
		 */
		__name: 'h5.ui.components.datagrid.view.dom.ResizeColumnUIController',


		// --- Logic --- //

		_gridLogic: null,


		// --- Life Cycle Method --- //

		__init: function() {
			var $root = $(this.rootElement);

			// MEMO: static の場合 wrap するか検討
			if ($root.css('position') === 'static') {
				$root.css({
					position: 'relative'
				});
			}

			var $resizePreview = $('<div></div>');
			$resizePreview.addClass(RESIZE_COLUMN_PREVIEW_CLASS).css({
				position: 'absolute',
				top: 0,
				height: '100%',
				width: RESIZE_COLUMN_PREVIEW_WIDTH,
				'z-index': 10000
			}).hide();

			$root.append($resizePreview);
		},

		__ready: function() {
			if (!this._isEnable) {
				this.disableListeners();
			}
		},


		// --- Public Method --- //

		setGridLogic: function(gridLogic) {
			this._gridLogic = gridLogic;
		},

		isEnable: function() {
			return this._isEnable;
		},

		enable: function() {
			if (this._gridLogic == null) {
				this.throwError('enable() の前に gridLogic をセットしてください');
			}
			if (!this._gridLogic.canSetColumnWidth()) {
				this.log.warn('列幅の変更が不可な設定となっているため enable() は無視されます');
				return;
			}

			this._isEnable = true;
			if (this.isReady) {
				this.enableListeners();
			}
		},

		disable: function() {
			this._isEnable = false;
			if (this.isReady) {
				this.disableListeners();
			}
		},


		getResizeMarkerWidth: function() {
			return this._isEnable ? RESIZE_COLUMN_MARKER_WIDTH : 0;
		},

		makeResizeMarkerHtml: function() {
			return this._isEnable ? RESIZE_COLUMN_MARKER_HTML : '';
		},



		// --- Event Handler --- //

		'.gridResizeColumnMarker mousedown': function(context){
			context.event.stopPropagation();
		},

		'.gridResizeColumnMarker h5trackstart': function(context, $el) {
			var $root = $(this.rootElement);
			var $cell = $el.closest('.' + CELL_FRAME_CLASS);

			var column = $cell.data('h5DynGridColumn');
			var rootLeft = $root.offset().left;
			var columnLeft = $cell.offset().left;
			var columnRight = columnLeft + $cell.width();


			this._column = column;
			this._rootLeft = rootLeft;
			this._columnLeft = columnLeft;
			this._columnRight = columnRight;

			this._updatePreview();
			this._getPreview().show();
		},

		'.gridResizeColumnMarker h5trackmove': function(context) {
			var columnRight = context.event.pageX;
			var minRight = this._columnLeft + this._getMinSize();
			var maxRight = this._columnRight + this._getMaxSize();

			if (columnRight < minRight) {
				columnRight = minRight;
			} else if (maxRight < columnRight) {
				columnRight = maxRight;
			}

			this._columnRight = columnRight;
			this._updatePreview();
		},

		'.gridResizeColumnMarker h5trackend': function() {
			this._getPreview().hide();

			var width = Math.floor(this._columnRight - this._columnLeft);
			this._gridLogic.setColumnWidth(this._column, width);

			this._column = null;
			this._rootLeft = null;
			this._columnLeft = null;
			this._columnRight = null;
		},


		// --- Private Property --- //

		_isEnable: false,

		_column: null,

		_rootLeft: null,

		_columnLeft: null,

		_columnRight: null,


		// --- Private Method  --- //

		_getMinSize: function() {
			return this._gridLogic.getColumnWidthMin();
		},

		_getMaxSize: function() {
			return this._gridLogic.getColumnWidthMax();
		},

		_getPreview: function() {
			var $root = $(this.rootElement);
			return $root.children('.' + RESIZE_COLUMN_PREVIEW_CLASS);
		},

		_updatePreview: function() {
			var $preview = this._getPreview();

			var left = this._columnRight - this._rootLeft;
			$preview.css({
				left: left
			});
		}
	};


	//=============================
	// ColumnSortUIController
	//=============================

	var columnSortUIController = {

		// --- Metadata --- //

		/**
		 * @memberOf ColumnSortUIController
		 */
		__name: 'h5.ui.components.datagrid.view.dom.ColumnSortUIController',


		// --- Logic --- //

		_gridLogic: null,


		// --- Life Cycle Method --- //

		__ready: function() {
			if (!this._isEnable) {
				this.disableListeners();
			}
		},


		// --- Public Method --- //

		setGridLogic: function(gridLogic) {
			this._gridLogic = gridLogic;
		},

		setSortPropertySet: function(sortPropertySet) {
			this._sortPropertySet = sortPropertySet;
		},

		isEnable: function() {
			return this._isEnable;
		},

		enable: function() {
			this._isEnable = true;
			if (this.isReady) {
				this.enableListeners();
			}
		},

		disable: function() {
			this._isEnable = false;
			if (this.isReady) {
				this.disableListeners();
			}
		},

		makeSortIconHtml: function(order) {
			if (!this._isEnable) {
				return '';
			}

			var html = '<div';
			html += ' class="gridSortIcon"';
			html += ' data-h5-dyn-grid-sort-order="' + order + '"';
			html += ' style="';
			html += 'display: inline-block;';
			html += ' vertical-align: middle;';
			html += ' margin-left: 2px;';
			html += '">';

			// ASC
			html += '<div';
			html += ' class="gridSortArrow gridSortAscArrow';
			if (order === 'asc') {
				html += ' enableSort';
			}
			html += '"';
			html += ' style="';
			html += 'height: 0;';
			html += ' width: 0;';
			html += ' border-style: solid;';
			html += ' border-width: 5px;';
			html += ' border-top-color: transparent;';
			html += ' border-left-color: transparent;';
			html += ' border-right-color: transparent;';
			html += '"></div>';

			// Margin
			html += '<div class="gridSortArrowMargin"';
			html += ' style="';
			html += 'height: 2px;';
			html += '"></div>';

			// DESC
			html += '<div';
			html += ' class="gridSortArrow gridSortDescArrow';
			if (order === 'desc') {
				html += ' enableSort';
			}
			html += '"';
			html += ' style="';
			html += 'height: 0;';
			html += ' width: 0;';
			html += ' border-style: solid;';
			html += ' border-width: 5px;';
			html += ' border-bottom-color: transparent;';
			html += ' border-left-color: transparent;';
			html += ' border-right-color: transparent;';
			html += '"></div>';

			html += '</div>';

			return html;
		},


		// --- Event Handler --- //

		'.gridSortIcon click': function(context, $el) {
			var $frame = $el.closest('.gridCellFrame');

			var row = $frame.data('h5DynGridRow');
			var column = $frame.data('h5DynGridColumn');

			var cell = this._gridLogic.getGridCell(row, column);

			var oldOrder = $el.data('h5DynGridSortOrder');
			var newOrder;
			if (oldOrder == null) {
				newOrder = 'asc';
			} else if (oldOrder === 'asc') {
				newOrder = 'desc';
			} else {
				newOrder = null;
			}

			// Eclipse の警告を回避するために宣言と代入を分割している
			var sortParam;
			sortParam = [];

			if (newOrder != null) {
				sortParam = [{
					property: this._sortPropertySet[cell.propertyName],
					order: newOrder
				}];
			}

			var searcher = this._gridLogic.getDataSearcher();
			var searchParam = searcher.getSearchParam();
			if (searchParam == null) {
				searchParam = {};
			}
			searchParam.sort = sortParam;

			searcher.changeSearchParam(searchParam);
		},

		// --- Private Property --- //

		_sortPropertySet: null,

		_isEnable: false
	};


	//=============================
	// ColumnSortAndFilterUIController
	//=============================

	var columnSortAndFilterUIController = {

		// --- Metadata --- //

		/**
		 * @memberOf ColumnSortAndFilterUIController
		 */
		__name: 'h5.ui.components.datagrid.view.dom.ColumnSortAndFilterUIController',


		// --- Logic --- //

		_gridLogic: null,


		// --- Life Cycle Method --- //

		__init: function() {
			this._makeMenu();
		},

		__ready: function() {
			if (!this._isEnable) {
				this.disableListeners();
			}
		},


		// --- Public Method --- //

		setGridLogic: function(gridLogic) {
			this._gridLogic = gridLogic;
		},

		setSortPropertySet: function(sortPropertySet) {
			this._sortPropertySet = sortPropertySet;
		},

		setFilterPropertySet: function(filterPropertySet) {
			this._filterPropertySet = filterPropertySet;
		},

		/**
		 * @param {{asc: Array.<string>, desc: Array.<string>, clear: Array.<string>}} param
		 */
		setSortIconClasses: function(param) {
			this._ascIconClasses = param.asc;
			this._descIconClasses = param.desc;
			this._clearIconClasses = param.clear;

			if (!this.isInit) {
				return;
			}

			var $menu = this._findMenu();
			util.forEach(param.asc, function(iconClass) {
				$menu.find('.gridSortAscIcon > span').addClass(iconClass);
			});
			util.forEach(param.desc, function(iconClass) {
				$menu.find('.gridSortDescIcon > span').addClass(iconClass);
			});
			util.forEach(param.clear, function(iconClass) {
				$menu.find('.gridSortClearIcon > span').addClass(iconClass);
			});
		},

		isEnable: function() {
			return this._isEnable;
		},

		enable: function() {
			this._isEnable = true;
			if (this.isReady) {
				this.enableListeners();
			}
		},

		disable: function() {
			this._isEnable = false;
			if (this.isReady) {
				this.disableListeners();
			}
		},

		makeButtonHtml: function() {
			if (!this._isEnable) {
				return '';
			}

			var html = '';
			html += '<button';
			html += ' class="gridColumnSortAndFilterButton"';
			html += ' tabindex="-1"';
			html += '>';

			html += '<div';
			html += ' class="gridColumnSortAndFilterButtonIcon"';
			html += '>';
			html += '</div>';

			html += '</button>';
			return html;
		},


		// --- Event Handler --- //

		'.gridColumnSortAndFilterButton click': function(context, $el) {
			// isReady でなければ無視する
			if (!this._gridLogic.isReady()) {
				return;
			}

			var $frame = $el.closest('.gridCellFrame');

			var row = $frame.data('h5DynGridRow');
			var column = $frame.data('h5DynGridColumn');

			var cell = this._gridLogic.getGridCell(row, column);

			var frameOffset = $frame.offset();
			var topPosition = frameOffset.top + $frame.outerHeight();
			var rightPosition = frameOffset.left + $frame.outerWidth(); // 右端が左から何px目か

			this._showMenu(cell, topPosition, rightPosition);
		},

		'{#gridSortAndFilterOverlay} click': function(context, $el) {
			// メニューの owner でなければ無視する
			if (!this._isOwner()) {
				return;
			}

			if (!$el.is(context.event.target)) {
				return;
			}
			this._hideMenu();
		},

		'{.gridSortAscItem} click': function(context, $el) {
			// メニューの owner でなければ無視する
			if (!this._isOwner()) {
				return;
			}

			// selected の場合は無視する
			if ($el.is('.selected')) {
				return;
			}

			// isReady でなければ無視する
			if (!this._gridLogic.isReady()) {
				return;
			}

			var $menu = this._findMenu();
			var property = $menu.data(COLUMN_SORT_AND_FILTER_SORT_PROPERTY_DATA_NAME);

			var sortParam;
			sortParam = [{
				property: property,
				order: 'asc'
			}];

			var searcher = this._gridLogic.getDataSearcher();
			var searchParam = searcher.getSearchParam();
			if (searchParam == null) {
				searchParam = {};
			}
			searchParam.sort = sortParam;

			this._currentSearchParam = searchParam;
			searcher.changeSearchParam(searchParam);

			this._hideMenu();
		},

		'{.gridSortDescItem} click': function(context, $el) {
			// メニューの owner でなければ無視する
			if (!this._isOwner()) {
				return;
			}

			// selected の場合は無視する
			if ($el.is('.selected')) {
				return;
			}

			// isReady でなければ無視する
			if (!this._gridLogic.isReady()) {
				return;
			}

			var $menu = this._findMenu();
			var property = $menu.data(COLUMN_SORT_AND_FILTER_SORT_PROPERTY_DATA_NAME);

			var sortParam;
			sortParam = [{
				property: property,
				order: 'desc'
			}];

			var searcher = this._gridLogic.getDataSearcher();
			var searchParam = searcher.getSearchParam();
			if (searchParam == null) {
				searchParam = {};
			}
			searchParam.sort = sortParam;

			this._currentSearchParam = searchParam;
			searcher.changeSearchParam(searchParam);

			this._hideMenu();
		},

		'{.gridSortClearItem} click': function(context, $el) {
			// メニューの owner でなければ無視する
			if (!this._isOwner()) {
				return;
			}

			// disabled の場合は無視する
			if ($el.is('.disabled')) {
				return;
			}

			// isReady でなければ無視する
			if (!this._gridLogic.isReady()) {
				return;
			}


			var searcher = this._gridLogic.getDataSearcher();
			var searchParam = searcher.getSearchParam();
			if (searchParam == null) {
				searchParam = {};
			}
			searchParam.sort = [];

			this._currentSearchParam = searchParam;
			searcher.changeSearchParam(searchParam);

			this._hideMenu();
		},

		'{.filterOptionCheckbox} change': function(context, $el) {
			// メニューの owner でなければ無視する
			if (!this._isOwner()) {
				return;
			}

			// isReady でなければ無視する
			if (!this._gridLogic.isReady()) {
				return;
			}

			var $menu = this._findMenu();
			var $allCheckbox = $menu.find('#gridFilterOptionCheckbox_all');

			// Select All の変更
			if ($el.is($allCheckbox)) {
				$('.filterOptionCheckbox').prop('checked', $el.prop('checked'));
				return;
			}

			// すべて選択されているかの判定
			var $checkboxes = $menu.find('.filterOptionCheckbox').not($allCheckbox);
			var isAllSelected = !$checkboxes.is(':not(:checked)');
			$allCheckbox.prop('checked', isAllSelected);
		},

		'{.gridFilterButton} click': function() {
			// メニューの owner でなければ無視する
			if (!this._isOwner()) {
				return;
			}

			// isReady でなければ無視する
			if (!this._gridLogic.isReady()) {
				return;
			}

			var $menu = this._findMenu();
			var property = $menu.data(COLUMN_SORT_AND_FILTER_SORT_PROPERTY_DATA_NAME);

			var searcher = this._gridLogic.getDataSearcher();
			var searchParam = searcher.getSearchParam();
			if (searchParam == null) {
				searchParam = {};
			}

			// 選択式の場合
			if ($menu.find('.gridFilterOptionsItem').is(':visible')) {
				var $checkboxes = $menu.find('.filterOptionCheckbox');

				var selected = [];
				var options = [];

				$checkboxes.each(function(i, checkbox) {
					var isChecked = checkbox.checked;
					var value = h5.u.obj.deserialize(checkbox.value);
					if (checkbox.id !== 'gridFilterOptionCheckbox_all' && isChecked) {
						selected.push(value);
					}

					options.push({
						id: checkbox.id,
						value: value,
						checked: checkbox.checked
					});
				});

				// 選択されているチェックボックスを記憶する
				this._currentFilter = {
					property: property,
					options: options
				};

				searchParam.filter = [{
					property: property,
					predicate: function(value) {
						return $.inArray(value, selected) !== -1;
					}
				}];

				this._currentSearchParam = searchParam;
				searcher.changeSearchParam(searchParam);

				this._hideMenu();
				return;
			}

			// 部分一致の場合
			var isExclude = $menu.find('.gridPartialMatchTypeSelect').val() === 'excludeText';
			var text = $menu.find('.gridPartialMatchFilterInput').val();

			this._currentFilter = {
				property: property,
				isExclude: isExclude,
				text: text
			};

			searchParam.filter = [{
				property: property,
				predicate: function(value) {
					var match = String(value).indexOf(text) !== -1;
					return isExclude ? !match : match;
				}
			}];

			this._currentSearchParam = searchParam;
			searcher.changeSearchParam(searchParam);

			this._hideMenu();
		},

		'{.gridFilterClearButton} click': function() {
			// メニューの owner でなければ無視する
			if (!this._isOwner()) {
				return;
			}

			// isReady でなければ無視する
			if (!this._gridLogic.isReady()) {
				return;
			}

			this._currentFilter = null;

			var searcher = this._gridLogic.getDataSearcher();
			var searchParam = searcher.getSearchParam();
			if (searchParam == null) {
				searchParam = {};
			}
			searchParam.filter = null;

			this._currentSearchParam = searchParam;
			searcher.changeSearchParam(searchParam);

			this._hideMenu();
		},

		'{rootElement} gridChangeSearchSuccess': function(context) {
			var searchParam = context.evArg.searchParam;
			if (!util.deepEquals(searchParam, this._currentSearchParam)) {
				this._currentFilter = null;
				this._currentSearchParam = null;
			}
		},


		// --- Private Property --- //

		_sortPropertySet: null,

		_filterPropertySet: null,

		_ascIconClasses: null,

		_descIconClasses: null,

		_clearIconClasses: null,

		_isEnable: false,

		_currentFilter: null,

		_currentSearchParam: null,


		// --- Private Method --- //

		_findOverlay: function() {
			return $('#' + COLUMN_SORT_AND_FILTER_OVERLAY_ID);
		},

		_findMenu: function() {
			var $overlay = this._findOverlay();
			return $overlay.find('.' + COLUMN_SORT_AND_FILTER_MENU_CLASS);
		},

		_makeMenu: function() {
			var idSelector = '#' + COLUMN_SORT_AND_FILTER_OVERLAY_ID;
			if (0 < $(idSelector).length) {
				return;
			}

			var $body = $('body');
			var ITEM_CLASS = 'gridSortAndFilterMenuItem';

			var $overlay = $('<div></div>');
			$overlay.attr('id', COLUMN_SORT_AND_FILTER_OVERLAY_ID);
			$overlay.addClass('gridFilterMenuOverlay');
			$overlay.css({
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',

				'z-index': 9999
			});
			$overlay.hide();
			$body.append($overlay);


			var $menu = $('<div></div>');
			$menu.attr('tabindex', '-1');
			$menu.addClass(COLUMN_SORT_AND_FILTER_MENU_CLASS);
			$menu.css({
				position: 'absolute',
				overflow: 'hidden',
				top: 0,
				left: 0
			});
			$overlay.append($menu);

			var $menuList = $('<ul></ul>');
			$menuList.addClass('gridSortAndFilterMenuList');
			$menu.append($menuList);

			// 昇順ソート
			var $sortAscItem = $('<li></li>');
			$sortAscItem.addClass(ITEM_CLASS);
			$sortAscItem.addClass('gridSortItem');
			$sortAscItem.addClass('gridSortAscItem');
			$menuList.append($sortAscItem);

			var $sortAscIcon = $('<div></div>');
			$sortAscIcon.addClass('gridSortIcon');
			$sortAscIcon.addClass('gridSortAscIcon');
			$sortAscItem.append($sortAscIcon);

			var $sortAscIconSpan = $('<span></span>');
			util.forEach(this._ascIconClasses, function(iconClass) {
				$sortAscIconSpan.addClass(iconClass);
			});
			$sortAscIcon.append($sortAscIconSpan);

			var $sortAscText = $('<div></div>');
			$sortAscText.addClass('gridSortText');
			$sortAscText.addClass('gridSortAscText');
			$sortAscText.text('Sort Ascending');
			$sortAscItem.append($sortAscText);

			// 降順ソート
			var $sortDescItem = $('<li></li>');
			$sortDescItem.addClass(ITEM_CLASS);
			$sortDescItem.addClass('gridSortItem');
			$sortDescItem.addClass('gridSortDescItem');
			$menuList.append($sortDescItem);

			var $sortDescIcon = $('<div></div>');
			$sortDescIcon.addClass('gridSortIcon');
			$sortDescIcon.addClass('gridSortDescIcon');
			$sortDescItem.append($sortDescIcon);

			var $sortDescIconSpan = $('<span></span>');
			util.forEach(this._descIconClasses, function(iconClass) {
				$sortDescIconSpan.addClass(iconClass);
			});
			$sortDescIcon.append($sortDescIconSpan);

			var $sortDescText = $('<div></div>');
			$sortDescText.addClass('gridSortText');
			$sortDescText.addClass('gridSortDescText');
			$sortDescText.text('Sort Descending');
			$sortDescItem.append($sortDescText);

			// ソートのクリア
			var $sortClearItem = $('<li></li>');
			$sortClearItem.addClass(ITEM_CLASS);
			$sortClearItem.addClass('gridSortItem');
			$sortClearItem.addClass('gridSortClearItem');
			$menuList.append($sortClearItem);

			var $sortClearIcon = $('<div></div>');
			$sortClearIcon.addClass('gridSortIcon');
			$sortClearIcon.addClass('gridSortClearIcon');
			$sortClearItem.append($sortClearIcon);

			var $sortClearIconSpan = $('<span></span>');
			util.forEach(this._clearIconClasses, function(iconClass) {
				$sortClearIconSpan.addClass(iconClass);
			});
			$sortClearIcon.append($sortClearIconSpan);


			var $sortClearText = $('<div></div>');
			$sortClearText.addClass('gridSortText');
			$sortClearText.addClass('gridSortClearText');
			$sortClearText.text('Clear Sort');
			$sortClearItem.append($sortClearText);

			// ソートとフィルタの境界線
			var $itemBorder = $('<li></li>');
			$itemBorder.addClass('gridSortItemBorder');
			$menuList.append($itemBorder);

			// フィルタ条件選択セレクトボックス
			var $partialMatchTypeSelectItem = $('<li></li>');
			$partialMatchTypeSelectItem.addClass(ITEM_CLASS);
			$partialMatchTypeSelectItem.addClass('gridFilterItem');
			$partialMatchTypeSelectItem.addClass('gridFilterMatchItem');
			$partialMatchTypeSelectItem.addClass('gridPartialMatchTypeSelectItem');
			$menuList.append($partialMatchTypeSelectItem);

			var $partialMatchTypeSelect = $('<select></select>');
			$partialMatchTypeSelect.addClass('gridPartialMatchTypeSelect');
			$partialMatchTypeSelectItem.append($partialMatchTypeSelect);

			// 条件1: テキストとして含む
			var $includeTextOption = $('<option></option>');
			$includeTextOption.attr('value', 'includeText');
			$includeTextOption.text('Include');
			$partialMatchTypeSelect.append($includeTextOption);

			// 条件2: テキストとして含まない
			var $excludeTextOption = $('<option></option>');
			$excludeTextOption.attr('value', 'excludeText');
			$excludeTextOption.text('Exclude');
			$partialMatchTypeSelect.append($excludeTextOption);

			// フィルタ用入力フォーム
			var $partialMatchFilterItem = $('<li></li>');
			$partialMatchFilterItem.addClass(ITEM_CLASS);
			$partialMatchFilterItem.addClass('gridFilterItem');
			$partialMatchFilterItem.addClass('gridFilterMatchItem');
			$partialMatchFilterItem.addClass('gridPartialMatchFilterItem');
			$menuList.append($partialMatchFilterItem);

			var $partialMatchFilterInput = $('<input type="text">');
			$partialMatchFilterInput.addClass('gridPartialMatchFilterInput');
			$partialMatchFilterInput.attr('placeholder', 'Search');
			$partialMatchFilterItem.append($partialMatchFilterInput);

			// フィルタ要素選択
			var $filterOptionsItem = $('<li></li>');
			$filterOptionsItem.addClass('gridFilterItem');
			$filterOptionsItem.addClass('gridFilterOptionsItem');
			$menuList.append($filterOptionsItem);

			var $filterOptionsList = $('<ul></ul>');
			$filterOptionsList.addClass('gridFilterOptionsList');
			$filterOptionsItem.append($filterOptionsList);

			var $selectAllOptionItem = $('<li></li>');
			$filterOptionsList.append($selectAllOptionItem);

			// 全選択オプション
			var $selectAllCheckBox = $('<input type="checkbox">');
			$selectAllCheckBox.attr('id', 'gridFilterOptionCheckbox_all');
			$selectAllCheckBox.addClass('filterOptionCheckbox');
			$selectAllCheckBox.attr('value', h5.u.obj.serialize('(Select All)'));
			$selectAllCheckBox.attr('checked');
			$selectAllOptionItem.append($selectAllCheckBox);

			var $selectAllLabel = $('<label></label>');
			$selectAllLabel.attr('for', 'gridFilterOptionCheckbox_all');
			$selectAllLabel.text('(Select All)');
			$selectAllOptionItem.append($selectAllLabel);

			// フィルタ適用ボタン、フィルタクリアボタン
			var $filterButtonsItem = $('<li></li>');
			$filterButtonsItem.addClass(ITEM_CLASS);
			$filterButtonsItem.addClass('gridFilterItem');
			$filterButtonsItem.addClass('gridFilterButtons');
			$menuList.append($filterButtonsItem);

			var $filterButton = $('<button></button>');
			$filterButton.addClass('gridFilterButton');
			$filterButton.text('Filter');
			$filterButtonsItem.append($filterButton);

			var $filterClearButton = $('<button></button>');
			$filterClearButton.addClass('gridFilterClearButton');
			$filterClearButton.text('Clear Filter');
			$filterButtonsItem.append($filterClearButton);
		},

		_showMenu: function(cell, topPosition, rightPosition) {
			var $overlay = this._findOverlay();
			var $menu = this._findMenu();

			// 既に見えていたら無視する
			if ($overlay.is(':visible')) {
				return;
			}

			var propertyName = cell.propertyName;
			var sortSetting = this._sortPropertySet[propertyName];
			var filterSetting = this._filterPropertySet[propertyName];

			// sort する property 名を $menu の data 属性に入れておく
			$menu.data(COLUMN_SORT_AND_FILTER_SORT_PROPERTY_DATA_NAME, sortSetting.property);

			// sort されている場合はそこをハイライト
			var sortOrder = null;

			var searchParam = this._gridLogic.getSearchParam();
			var sortParam = {};
			if (searchParam != null && searchParam.sort != null) {
				sortParam = searchParam.sort;
			}

			util.forEach(sortParam, function(sortInfo) {
				if (sortInfo.property === sortSetting.property) {
					sortOrder = sortInfo.order;
					return false;
				}
			});

			var selectedClass = 'selected';
			$menu.find('.gridSortAscItem').toggleClass(selectedClass, sortOrder === 'asc');
			$menu.find('.gridSortDescItem').toggleClass(selectedClass, sortOrder === 'desc');

			// sort がひとつでもあれば clear を無効にする
			$menu.find('.gridSortClearItem').toggleClass('disabled', $.isEmptyObject(sortParam));

			var filterType = filterSetting.type;

			if (filterType === 'distinctValues') {
				var object = {};
				var references = this._gridLogic.getDataReferences();
				util.forEach(references, function(reference) {
					if (!reference.isLoaded) {
						return;
					}

					var value = reference.data.edited[propertyName];
					var key = h5.u.obj.serialize(value);
					object[key] = true;
				});

				var keys = util.map(object, function(v, k) {
					return h5.u.obj.deserialize(k);
				});
				this._setFilterOptions(propertyName, keys);
			} else if (filterType === 'arrayValues') {
				this._setFilterOptions(propertyName, filterSetting.values);
			} else {
				if (this._currentFilter != null && this._currentFilter.property === propertyName) {
					var currentFilter = this._currentFilter;
					var selectedValue = currentFilter.isExclude ? 'excludeText' : 'includeText';
					$menu.find('.gridPartialMatchTypeSelect').val(selectedValue);
					$menu.find('.gridPartialMatchFilterInput').val(currentFilter.text);
				} else {
					$menu.find('.gridPartialMatchTypeSelect').val('includeText');
					$menu.find('.gridPartialMatchFilterInput').val('');
				}
			}

			// 条件にあわせてメニューの表示を切り替える
			$menu.find('.gridSortItem').toggle(sortSetting.enable);
			$menu.find('.gridFilterItem').toggle(filterSetting.enable);
			$menu.find('.gridSortItemBorder').toggle(sortSetting.enable && filterSetting.enable);

			// filter type にあわせて表示する要素を切り替える
			if (filterSetting.enable) {
				$menu.find('.gridFilterMatchItem').toggle(filterType === 'partialMatch');
				$menu.find('.gridFilterOptionsItem').toggle(filterType !== 'partialMatch');
			}

			$overlay.show();
			var width = $menu.outerWidth();

			var position = {};
			position.top = topPosition;
			position.left = rightPosition - width;

			if (position.left < 0) {
				position.left = 0;
			}

			$menu.css(position);
			$overlay.data(COLUMN_SORT_AND_FILTER_OWNER_DATA_NAME, this);

			$menu.focus();
		},

		_setFilterOptions: function(property, optionValues) {
			var options;
			if (this._currentFilter != null && this._currentFilter.property === property) {
				options = this._currentFilter.options;
				this._findMenu().find('.gridFilterOptionsList').empty();
			} else {
				options = util.map(optionValues, function(optionValue) {
					return {
						value: optionValue,
						checked: true
					};
				});

				options.sort(function(a, b) {
					if (a.value < b.value) {
						return -1;
					}
					if (a.value === b.value) {
						return 0;
					}
					return 1;
				});

				options = util.map(options, function(option, i) {
					option.id = 'gridFilterOptionCheckbox_' + i;
					return option;
				});
			}

			var $menu = this._findMenu();
			var $list = $menu.find('.gridFilterOptionsList');

			// (Select All) 以外を削除
			var $selectAllCheckBox = $('#gridFilterOptionCheckbox_all');
			$selectAllCheckBox.closest('li').nextAll().remove();

			$selectAllCheckBox.prop('checked', true);

			var html = '';

			util.forEach(options, function(option) {
				html += '<li>';
				html += '<input type="checkbox"';
				html += ' id="' + option.id + '"';
				html += ' class="filterOptionCheckbox"';
				html += ' value="' + h5.u.obj.serialize(option.value) + '"';
				if (option.checked) {
					html += ' checked';
				}
				html += '>';
				html += '<label for="' + option.id + '">';
				html += option.value;
				html += '</label>';
				html += '</li>';
			});

			$list.append(html);
		},

		_hideMenu: function() {
			// メニューのオーナーが異なっていたら無視する
			if (!this._isOwner()) {
				return;
			}

			var $overlay = this._findOverlay();

			// 見えていなかったら無視する
			if (!$overlay.is(':visible')) {
				return;
			}

			$overlay.hide();
		},

		_isOwner: function() {
			var $overlay = this._findOverlay();
			return $overlay.data(COLUMN_SORT_AND_FILTER_OWNER_DATA_NAME) === this;
		}
	};


	//=============================
	// TableGridViewController
	//=============================

	var tableGridViewController = {

		// --- Metadata --- //

		/**
		 * @memberOf TableGridViewController
		 */
		__name: 'h5.ui.components.datagrid.view.dom.TableGridViewController',

		__meta: {
			_verticalScrollBarController: {
				rootElement: '.' + VERTICAL_SCROLL_BAR_CLASS
			},
			_horizontalScrollBarController: {
				rootElement: '.' + HORIZONTAL_SCROLL_BAR_CLASS
			},

			_headerTopLeftBoxController: {
				rootElement: '.' + HEADER_TOP_LEFT_BOX_CLASS
			},
			_headerRowsBoxController: {
				rootElement: '.' + HEADER_ROWS_BOX_CLASS
			},
			_headerColumnsBoxController: {
				rootElement: '.' + HEADER_COLUMNS_BOX_CLASS
			},
			_mainBoxController: {
				rootElement: '.' + MAIN_BOX_CLASS
			}
		},

		// --- Child Controller --- //

		_verticalScrollBarController: verticalScrollBarController,

		_horizontalScrollBarController: horizontalScrollBarController,

		_headerTopLeftBoxController: virtualScrollBoxController,

		_headerRowsBoxController: virtualScrollBoxController,

		_headerColumnsBoxController: virtualScrollBoxController,

		_mainBoxController: virtualScrollBoxController,

		_resizeColumnUIController: resizeColumnUIController,

		_columnSortUIController: columnSortUIController,

		_columnSortAndFilterUIController: columnSortAndFilterUIController,


		// --- Logic --- //

		_gridLogic: null,


		// --- Life Cycle Method --- //

		__construct: function() {
			this._activateDeferred = h5.async.deferred();
			this._readyLogicDeferred = h5.async.deferred();

			var keydownArrow = this.own(this._triggerKeydownArrow);

			this._keydownArrowThrottle = util.createThrottle(KEYDOWN_WAIT_TIME, keydownArrow, {
				deferFirst: true,
				deferInWaiting: false
			});


			var fetch = this.own(this._fetch);

			this._fetchDebounce = util.createThrottle(FETCH_WAIT_TIME, fetch, {
				deferFirst: true,
				deferInWaiting: true
			});

			var selectRangeScroll = this.own(this._selectRangeScroll);

			var wait = SELECT_RANGE_SCROLL_WAIT_TIME;
			this._selectRangeScrollThrottle = util.createThrottle(wait, selectRangeScroll, {
				deferFirst: false,
				deferInWaiting: false
			});
		},

		__init: function() {
			// rootElement の css 設定
			var $root = $(this.rootElement);

			var rootPosition = $root.css('position');

			if (rootPosition === 'static') {
				rootPosition = 'relative';
			}

			if ($root.attr('tabindex') == null) {
				$root.attr('tabindex', 0);
			}

			$root.css({
				position: rootPosition,
				overflow: 'hidden'
			});


			// 左上のヘッダを表示する要素を作成
			var $headerTopLeftBox = $('<div></div>').addClass(HEADER_TOP_LEFT_BOX_CLASS);
			$headerTopLeftBox.css({
				position: 'absolute',
				top: 0,
				left: 0
			});
			$root.append($headerTopLeftBox);


			// ヘッダ行を表示する要素を作成
			var $headerRows = $('<div></div>').addClass(HEADER_ROWS_BOX_CLASS);
			$headerRows.css({
				position: 'absolute',
				top: 0
			});
			$root.append($headerRows);


			// ヘッダ列を表示する要素を作成
			var $headerColumns = $('<div></div>').addClass(HEADER_COLUMNS_BOX_CLASS);
			$headerColumns.css({
				position: 'absolute',
				left: 0
			});
			$root.append($headerColumns);


			// メイン領域を表示する要素を作成
			var $mainBox = $('<div></div>').addClass(MAIN_BOX_CLASS);
			$mainBox.css({
				position: 'absolute'
			});
			$root.append($mainBox);


			// スクロールバーをバインドする DOM を作成
			var $verticalBar = $('<div></div>').addClass(VERTICAL_SCROLL_BAR_CLASS);
			$verticalBar.css({
				position: 'absolute',
				right: 0
			});
			$root.append($verticalBar);

			var $horizontalBar = $('<div></div>').addClass(HORIZONTAL_SCROLL_BAR_CLASS);
			$horizontalBar.css({
				position: 'absolute',
				bottom: 0
			});
			$root.append($horizontalBar);


			// コピペ用のテキストエリアを作成
			var offset = $root.offset();
			var $copyTarget = $('<div></div>').addClass(COPY_TARGET_CLASS).css({
				position: 'fixed',
				top: -offset.top - 1000,
				left: -offset.left - 1000
			}).appendTo($root);

			$('<textarea></textarea>').css({
				width: '1px',
				height: '1px',
				overflow: 'hidden',
				opacity: 0
			}).appendTo($copyTarget);

			this._refreshBoxPosition();
		},

		__unbind: function() {
			this._keydownArrowThrottle.dispose();
			this._fetchDebounce.dispose();
			this._selectRangeScrollThrottle.dispose();

			$(this.rootElement).empty();
		},


		// --- Public Method --- //

		setGridLogic: function(gridLogic) {
			this._gridLogic = gridLogic;
		},

		activate: function(param) {
			var validator = this._argsValidator('public');
			validator.arg('viewParam', param, type.validateTableGridViewControllerParam);

			this._param = param;

			this._formatterSet = this._makeFormatterSet(param);
			this._sortSet = this._makeSortSet(param);
			this._filterSet = this._makeFilterSet(param);


			this.readyPromise.then(this.own(function() {

				this._registerCellHandler(param);


				// ResizeColumnUI
				this._resizeColumnUIController.setGridLogic(this._gridLogic);

				// ColumnSortUI
				var sortPropertySet = util.mapObject(this._sortSet, function(value, property) {
					return {
						key: property,
						value: value.property
					};
				});
				this._columnSortUIController.setGridLogic(this._gridLogic);
				this._columnSortUIController.setSortPropertySet(sortPropertySet);

				// ColumnSortAndFilterUI
				this._columnSortAndFilterUIController.setGridLogic(this._gridLogic);
				this._columnSortAndFilterUIController.setSortPropertySet(this._sortSet);
				this._columnSortAndFilterUIController.setFilterPropertySet(this._filterSet);
				this._columnSortAndFilterUIController.setSortIconClasses({
					asc: param.sortAscIconClasses,
					desc: param.sortDescIconClasses,
					clear: param.sortClearIconClasses
				});


				// Enable Controllers
				if (this._param.enableResizeColumnUI) {
					this._resizeColumnUIController.enable();
				}
				if (this._param.enableColumnSortAndFilterUI) {
					this._columnSortAndFilterUIController.enable();
				}


				var rendererParam = {
					defaultFormatter: this._param.defaultFormatter,
					formatterSet: this._formatterSet,
					sortSet: this._sortSet,
					filterSet: this._filterSet,
					cellClassDefinition: this._param.cellClassDefinition,
					disableInput: this._param.disableInput,
					resizeColumnUI: this._resizeColumnUIController,
					columnSortAndFilterUI: this._columnSortAndFilterUIController
				};

				var renderer = createTableRenderer(rendererParam);

				this._headerTopLeftBoxController.activate(renderer);
				this._headerRowsBoxController.activate(renderer);
				this._headerColumnsBoxController.activate(renderer);
				this._mainBoxController.activate(renderer);

				this._scroll(this._vPos, this._hPos);
				this._activateDeferred.resolve();
			}));

			this._readyLogicDeferred.resolve();

			return this.getActivatePromise();
		},

		getActivatePromise: function() {
			return this._activateDeferred.promise();
		},

		isActive: function() {
			return this._activateDeferred.state() === 'resolved';
		},

		refresh: function() {
			if (!this.isActive()) {
				return;
			}
			this._refreshBoxPosition();

			this._renderRange = null;
			this._scroll(this._vPos, this._hPos);
		},

		setCellClassDefinition: function(cellClassDefinition) {
			var validator = this._argsValidator('user');
			validator.arg('cellClassDefinition', cellClassDefinition, function(v) {
				v.nullable();
				type.validateCellClassDefinition(v);
			});

			this._param.cellClassDefinition = cellClassDefinition;
			this._updateRenderer();

			this.refresh();
		},

		setDisableInput: function(disableInput) {
			var validator = this._argsValidator('user');
			validator.arg('disableInput', disableInput, function(v) {
				v.nullable();
				v.func();
			});

			this._param.disableInput = disableInput;
			this._updateRenderer();

			this.refresh();
		},


		// --- Event Handler --- //

		'.gridCell > input:text keydown': function(context) {
			var event = context.event;
			var keycode = context.event.which;

			// Enter
			if (keycode === 13) {
				event.stopPropagation();
				$(this.rootElement).focus();
			}

			// SPACE
			if (keycode === 32) {
				event.stopPropagation();
			}
		},

		'.gridCell > :text focusin': function(context, $el) {
			var $cellFrame = $el.closest('.gridCellFrame');
			var row = $cellFrame.data('h5DynGridRow');
			var column = $cellFrame.data('h5DynGridColumn');
			this._nextFocusCell = {
				row: row,
				column: column
			};
		},

		'{rootElement} focusin': function(context) {
			if (!$(context.event.target).is(this.rootElement)) {
				return;
			}

			if (this._nextFocusCell != null) {
				this._gridLogic.focusCell(this._nextFocusCell.row, this._nextFocusCell.column);
			}
			this._nextFocusCell = null;
		},

		'{rootElement} h5scroll': function(context) {
			context.event.stopPropagation();

			var vInfo = context.evArg.vertical;
			var hInfo = context.evArg.horizontal;

			var msg;

			var vPos = this._vPos;
			if (vInfo) {
				if (vInfo.type === 'scrollPosition') {
					vPos = vInfo.position;
				} else if (vInfo.type === 'scrollDiff') {
					vPos += vInfo.diff;
				} else if (vInfo.type === 'index') {
					vPos = this._calcVerticalPositionFromRow(vInfo.index);
				} else if (vInfo.type === 'indexDiff') {
					vPos = this._calcVerticalPositionFromIndexDiff(vInfo.diff);
				} else {
					msg = '不正な type を持つ h5scroll イベントです; verticalScroll.type = {0}';
					this.throwError(msg, vInfo.type);
				}
			}

			var hPos = this._hPos;
			if (hInfo) {
				if (hInfo.type === 'scrollPosition') {
					hPos = hInfo.position;
				} else if (hInfo.type === 'scrollDiff') {
					hPos += hInfo.diff;
				} else if (hInfo.type === 'index') {
					hPos = this._calcHorizontalPositionFromColumn(hInfo.index);
				} else if (hInfo.type === 'indexDiff') {
					hPos = this._calcHorizontalPositionFromIndexDiff(hInfo.diff);
				} else {
					msg = '不正な type を持つ h5scroll イベントです; horizontalScroll.type = {0}';
					this.throwError(msg, hInfo.type);
				}
			}

			this._scroll(vPos, hPos);
		},

		'{rootElement} mousewheel': function(context) {
			if (!this.isActive()) {
				return;
			}

			context.event.preventDefault();

			var diff = (context.event.wheelDelta < 0) ? 1 : -1;

			this.trigger('h5scroll', {
				vertical: {
					type: 'indexDiff',
					diff: diff
				}
			});
		},

		'{rootElement} keydown': function(context) {
			/* jshint maxcomplexity: 22 */
			if (!this.isActive()) {
				return;
			}

			var event = context.event;
			var keycode = event.which;

			var isCtrl = false;
			if (event.ctrlKey) {
				isCtrl = true;
			}

			// 上下左右キー
			if (37 <= keycode && keycode <= 40 && event.target === this.rootElement) {
				event.preventDefault();
				this._keydownArrowThrottle.call(event);
				return;
			}

			// Ctrl + C: Copy
			if (isCtrl && keycode === 67) {
				var $textArea = this.$find('.' + COPY_TARGET_CLASS).find('textarea');
				$textArea.val(this._getCopyText());
				$textArea.select();

				util.delay(0, function() {
					$textArea.select();
				});
				return;
			}

			// Ctrl + A: 全選択
			if (isCtrl && keycode === 65) {
				event.preventDefault();
				this._gridLogic.selectRangeAll();
				return;
			}

			var dataSource = this._gridLogic.getDataSource();

			// Ctrl + Z : Undo
			if (isCtrl && keycode === 90) {
				if (dataSource.canUndo()) {
					dataSource.undo();
				}
				return;
			}

			// Ctrl + Y : Redo
			if (isCtrl && keycode === 89) {
				if (dataSource.canRedo()) {
					dataSource.redo();
				}
				return;
			}


			var focusedCell = this._gridLogic.getFocusedCell();

			// Space
			if (keycode === 32) {
				event.preventDefault();
				if ($.isEmptyObject(focusedCell)) {
					return;
				}

				var row = focusedCell.row;
				var column = focusedCell.column;
				var cell = this._gridLogic.getGridCell(row, column);
				var dataId = cell.dataId;

				if (dataId == null) {
					return;
				}

				if (cell.isSelectedData) {
					this._gridLogic.unselectData(dataId);
				} else {
					this._gridLogic.selectData(dataId);
				}

				if (!cell.isFocusedData) {
					this._gridLogic.focusData(dataId);
				} else {
					this._gridLogic.resetDataFocus();
				}

				return;
			}

			// Enter or F2
			if (keycode === 13 || keycode === 113) {
				if ($.isEmptyObject(focusedCell)) {
					return;
				}

				var selector = '.gridCellFrame';
				selector += '[data-h5-dyn-grid-row="' + focusedCell.row + '"]';
				selector += '[data-h5-dyn-grid-column="' + focusedCell.column + '"]';
				selector += '>.gridCell';

				var $cell = this.$find(selector);
				var $target = $cell.find('> :input');

				if (1 <= $target.length) {
					if ($target.is(':checkbox')) {
						var checked = $target.prop('checked');
						$target.prop('checked', !checked);
						$target.change();
						return;
					}

					$target.focus();

					var elem = $target.get(0);
					if ($target.is(':text')) {
						elem.selectionStart = 0;
						elem.selectionEnd = elem.value.length;
					}
				}
			}

			// Esc
			if (keycode === 27) {
				$(this.rootElement).focus();
			}
		},

		'.gridCellFrame mousedown': function(context, $el) {
			var event = context.event;

			// 現在の位置を記憶する
			this._pageX = event.pageX;
			this._pageY = event.pageY;

			// 入力要素での mousedown は無視する
			var $target = $(event.target);
			if ($target.is(':input')) {
				return;
			}

			// テキスト選択を避けるために preventDefault
			event.preventDefault();

			var row = $el.data('h5DynGridRow');
			var column = $el.data('h5DynGridColumn');

			this._gridLogic.selectRangeStart(row, column);

			var headerRows = this._gridLogic.getHeaderRows();
			var headerColumns = this._gridLogic.getHeaderColumns();

			this._isSelectStartHeaderRows = row < headerRows;
			this._isSelectStartHeaderColumns = column < headerColumns;
		},

		'.gridCellFrame mousemove': function(context, $el) {
			if (!this._gridLogic.isSelectingRange()) {
				return;
			}

			var headerRows = this._gridLogic.getHeaderRows();
			var headerColumns = this._gridLogic.getHeaderColumns();

			var row = $el.data('h5DynGridRow');
			var column = $el.data('h5DynGridColumn');

			if (this._vPos !== 0) {
				if (this._isSelectStartHeaderRows && headerRows <= row) {
					row = headerRows - 1;
				} else if (!this._isSelectStartHeaderRows && row < headerRows) {
					row = headerRows;
				}
			}

			if (this._hPos !== 0) {
				if (this._isSelectStartHeaderColumns && headerColumns <= column) {
					column = headerColumns - 1;
				} else if (!this._isSelectStartHeaderColumns && column < headerColumns) {
					column = headerColumns;
				}
			}

			this._gridLogic.selectRangeMove(row, column);


			// 端に近付いたときのスクロール
			var event = context.event;
			var evArg = context.evArg;

			if (this._pageX === event.pageX && this._pageY === event.pageY) {
				return;
			}

			var pageX = event.pageX;
			if (pageX == null) {
				pageX = evArg.pageX;
			}
			var pageY = event.pageY;
			if (pageY == null) {
				pageY = evArg.pageY;
			}

			this._selectRangeScrollThrottle.call(pageX, pageY);
		},

		'{window} mouseup': function() {
			if (!this.isActive()) {
				return;
			}

			if (this._gridLogic.isSelectingRange()) {
				this._gridLogic.selectRangeEnd();
			}

			this._isSelectStartHeaderRows = null;
			this._isSelectStartHeaderColumns = null;

			this._pageX = null;
			this._pageY = null;
		},

		'{this._gridLogic} changeGrid': function(context) {
			this._refreshBoxPosition();
			this.refresh();

			var changes = context.event.changes;

			var hasChangeDataFocus = util.some(changes, function(change) {
				return change.type === 'changeDataFocus';
			});

			var hasChangeDataSelect = util.some(changes, function(change) {
				return change.type === 'changeDataSelect';
			});

			var hasChangeCellSelect = util.some(changes, function(change) {
				return change.type === 'changeCellSelect';
			});

			var editChanges = [];
			util.forEach(changes, function(change) {
				if (change.type === 'edit') {
					var isUndo = change.changeType === 'undo';
					editChanges = editChanges.concat(util.map(change.changes, function(c) {
						return {
							type: c.type,
							dataId: c.dataId,
							index: c.index,
							propertyName: c.propertyName,
							originalValue: c.originalValue,
							oldValue: c.oldValue,
							newValue: c.newValue,
							isUndo: isUndo
						};
					}));
				}
			});


			if (hasChangeDataFocus) {
				this.trigger('gridChangeDataFocus');
			}

			if (hasChangeDataSelect) {
				this.trigger('gridChangeDataSelect');
			}

			if (hasChangeCellSelect) {
				this.trigger('gridChangeCellSelect');
			}

			if (0 < editChanges.length) {
				this.trigger('gridEdit', {
					changes: editChanges
				});
			}

			if (hasChangeCellSelect) {
				this._nextFocusCell = null;
			}

			if (hasChangeDataFocus || hasChangeCellSelect || hasChangeDataSelect) {
				$(this.rootElement).focus();
			}
		},

		'{this._gridLogic} changeSearchComplete': function() {
			this.refresh();
		},

		'{this._gridLogic} refreshSearchComplete': function() {
			this.refresh();
		},

		// --- Private Property --- //

		_param: null,

		_formatterSet: null,

		_sortSet: null,

		_filterSet: null,


		_mainHeight: 0,

		_mainWidth: 0,


		_vPos: 0,

		_hPos: 0,

		_renderRange: null,

		_loading: false,

		_mainTop: 0,

		_mainLeft: 0,

		_mainBottom: 0,

		_mainRight: 0,

		_nextFocusCell: null,


		_isSelectStartHeaderRows: null,

		_isSelectStartHeaderColumns: null,


		_pageX: null,

		_pageY: null,


		_activateDeferred: null,

		_readyLogicDeferred: null,

		_keydownArrowThrottle: null,

		_fetchDebounce: null,

		_selectRangeScrollThrottle: null,


		// --- Private Method --- //

		_getCopyText: function() {
			return this._gridLogic.getSelectedRangeCopyText();
		},

		_calcVerticalPositionFromRow: function(row) {
			var begin = this._vPos;
			var mainHeight = this._mainHeight;
			var end = begin + mainHeight;

			var rowBegin = this._gridLogic.toVerticalPositionFromRow(row);
			var rowHeight = this._gridLogic.toHeightFromRow(row);
			var rowEnd = rowBegin + rowHeight;

			// 1行が表示領域より大きい場合
			if (mainHeight <= rowHeight) {
				return rowBegin;
			}

			// 対象行が表示領域より上にある場合
			if (rowBegin < begin) {
				return rowBegin;
			}

			// 対象行が表示領域より下にある場合
			if (end < rowEnd) {
				return rowEnd - mainHeight;
			}

			return begin;
		},

		_calcVerticalPositionFromIndexDiff: function(diff) {
			var d = diff;
			var vPos = this._vPos;
			var mainHeight = this._mainHeight;

			if (diff < 0) {
				while (d < 0) {
					vPos = this._gridLogic.calcPrevVerticalPosition(mainHeight, vPos);
					d += 1;
				}
			} else {
				while (0 < d) {
					vPos = this._gridLogic.calcNextVerticalPosition(mainHeight, vPos);
					d -= 1;
				}
			}

			return vPos;
		},

		_calcHorizontalPositionFromColumn: function(column) {
			var begin = this._hPos;
			var mainWidth = this._mainWidth;
			var end = begin + mainWidth;

			var columnBegin = this._gridLogic.toHorizontalPositionFromColumn(column);
			var columnWidth = this._gridLogic.toWidthFromColumn(column);
			var columnEnd = columnBegin + columnWidth;

			// 1行が表示領域より大きい場合
			if (mainWidth <= columnWidth) {
				return columnBegin;
			}

			// 対象行が表示領域より左にある場合
			if (columnBegin < begin) {
				return columnBegin;
			}

			// 対象行が表示領域より下にある場合
			if (end < columnEnd) {
				return columnEnd - mainWidth;
			}

			return begin;
		},

		_calcHorizontalPositionFromIndexDiff: function(diff) {
			var d = diff;
			var hPos = this._hPos;
			var mainWidth = this._mainWidth;

			if (diff < 0) {
				while (d < 0) {
					hPos = this._gridLogic.calcPrevHorizontalPosition(mainWidth, hPos);
					d += 1;
				}
			} else {
				while (0 < d) {
					hPos = this._gridLogic.calcNextHorizontalPosition(mainWidth, hPos);
					d -= 1;
				}
			}

			return hPos;
		},

		_triggerKeydownArrow: function(event) {
			/* jshint maxcomplexity: 21 */

			var keycode = event.which;
			var shiftKey = event.shiftKey;
			var ctrlKey = event.ctrlKey;

			if (shiftKey) {
				var result;
				var isVertical;

				if (keycode === 37) { // arrow-left
					result = this._gridLogic.selectRangeLeft();
					isVertical = false;
				} else if (keycode === 38) { // arrow-up
					result = this._gridLogic.selectRangeUp();
					isVertical = true;
				} else if (keycode === 39) { // arrow-right
					result = this._gridLogic.selectRangeRight();
					isVertical = false;
				} else if (keycode === 40) { // arrow-down
					result = this._gridLogic.selectRangeDown();
					isVertical = true;
				}

				var evArg = {};
				evArg[isVertical ? 'vertical' : 'horizontal'] = {
					type: 'index',
					index: result
				};

				this.trigger(SCROLL_EVENT_NAME, evArg);

				return;
			}

			var focusedCell = this._gridLogic.getFocusedCell();

			if ($.isEmptyObject(focusedCell)) {
				focusedCell = {
					row: 0,
					column: 0
				};
			}

			if (this._nextFocusCell != null) {
				focusedCell = this._nextFocusCell;
				this._nextFocusCell = null;
			}

			var row = focusedCell.row;
			var column = focusedCell.column;

			var totalRows = this._gridLogic.getTotalRows();
			var totalColumns = this._gridLogic.getTotalColumns();

			if (keycode === 37) { // arrow-left
				if (ctrlKey) {
					column = 0;
				} else {
					column -= 1;
				}
			} else if (keycode === 38) { // arrow-up
				if (ctrlKey) {
					row = 0;
				} else {
					row -= 1;
				}
			} else if (keycode === 39) { // arrow-right
				if (ctrlKey) {
					column = totalColumns - 1;
				} else {
					column += 1;
				}
			} else if (keycode === 40) { // arrow-down
				if (ctrlKey) {
					row = totalRows - 1;
				} else {
					row += 1;
				}
			}


			if (row < 0) {
				row = 0;
			} else if (totalRows <= row) {
				row = totalRows - 1;
			}

			if (column < 0) {
				column = 0;
			} else if (totalColumns <= column) {
				column = totalColumns - 1;
			}

			this._gridLogic.focusCell(row, column);
			this.trigger(SCROLL_EVENT_NAME, {
				vertical: {
					type: 'index',
					index: row
				},
				horizontal: {
					type: 'index',
					index: column
				}
			});
		},


		_refreshBoxPosition: function() {
			h5.async.when([this.initPromise, this._readyLogicDeferred]).then(this.own(function() {
				var logic = this._gridLogic;

				var $root = $(this.rootElement);
				var $headerCells = $root.children('.' + HEADER_TOP_LEFT_BOX_CLASS);
				var $headerRows = $root.children('.' + HEADER_ROWS_BOX_CLASS);
				var $headerColumns = $root.children('.' + HEADER_COLUMNS_BOX_CLASS);
				var $mainBox = $root.children('.' + MAIN_BOX_CLASS);
				var $verticalBar = $root.children('.' + VERTICAL_SCROLL_BAR_CLASS);
				var $horizontalBar = $root.children('.' + HORIZONTAL_SCROLL_BAR_CLASS);

				var scrollBarWidth = $verticalBar.width();

				var rootHeight = $root.height();
				var rootWidth = $root.width();

				var renderHeight = logic.getTotalHeight();
				var renderWidth = logic.getTotalWidth();


				// MEMO: この辺は renderer をかえると入れ替える必要あり

				var headerHeight = logic.getHeaderRowsHeight();
				var headerWidth = logic.getHeaderColumnsWidth();

				var mainHeight = rootHeight - headerHeight;
				var mainWidth = rootWidth - headerWidth;

				if (rootHeight <= renderHeight) {
					mainWidth -= scrollBarWidth;

					if (rootWidth - scrollBarWidth <= renderWidth) {
						mainHeight -= scrollBarWidth;
					}
				} else {
					if (rootWidth <= renderWidth) {
						mainHeight -= scrollBarWidth;
					}
				}


				this._mainHeight = mainHeight;
				this._mainWidth = mainWidth;

				if (mainHeight < 0) {
					this.log.warn('ヘッダ行が描画領域に入りきりません');
					mainHeight = 0;
				}
				if (mainWidth < 0) {
					this.log.warn('ヘッダ列が描画領域に入りきりません');
					mainWidth = 0;
				}

				$headerCells.css({
					height: headerHeight,
					width: headerWidth
				});

				$headerRows.css({
					left: headerWidth,
					height: headerHeight,
					width: mainWidth
				});

				$headerColumns.css({
					top: headerHeight,
					height: mainHeight,
					width: headerWidth
				});

				$mainBox.css({
					top: headerHeight,
					left: headerWidth,
					height: mainHeight,
					width: mainWidth
				});

				$verticalBar.css({
					top: headerHeight
				});
				this._verticalScrollBarController.setBarSize(mainHeight);

				$horizontalBar.css({
					left: headerWidth
				});
				this._horizontalScrollBarController.setBarSize(mainWidth);

				// mainBox の offset を記憶
				var mainOffset = $mainBox.offset();
				this._mainTop = mainOffset.top;
				this._mainLeft = mainOffset.left;
				this._mainBottom = mainOffset.top + $mainBox.height();
				this._mainRight = mainOffset.left + $mainBox.width();
			}));
		},

		_endRender: function(renderRange) {
			this._renderRange = $.extend({}, renderRange);

			if (this._loading) {
				this._loading = false;
			}


			this._mainBoxController.endLoad();
			this._headerColumnsBoxController.endLoad();
			this._headerRowsBoxController.endLoad();

			this.trigger('gridRender', renderRange);
		},

		_scroll: function(vPos, hPos) {
			var logic = this._gridLogic;

			var _vPos = vPos;
			var _hPos = hPos;

			var vEnd = logic.getVerticalScrollEndPosition(this._mainHeight);
			var hEnd = logic.getHorizontalScrollEndPosition(this._mainWidth);

			if (_vPos < 0) {
				_vPos = 0;
			}
			if (vEnd <= _vPos) {
				_vPos = vEnd - 1;
			}
			if (_hPos < 0) {
				_hPos = 0;
			}
			if (hEnd <= _hPos) {
				_hPos = hEnd - 1;
			}

			this.log.trace('Grid Scroll: ({0}, {1})', _vPos, _hPos);
			this._vPos = _vPos;
			this._hPos = _hPos;


			var mainHeight = this._mainHeight;
			var mainWidth = this._mainWidth;

			// スクロール後の表示範囲を計算
			var vDisplayRange = logic.calcVerticalDisplayRange(mainHeight, _vPos);
			var hDisplayRange = logic.calcHorizontalDisplayRange(mainWidth, _hPos);

			var vDisplaySize = logic.calcVerticalDisplaySize(mainHeight);
			var hDisplaySize = logic.calcHorizontalDisplaySize(mainWidth);

			// スクロールバーへの反映
			this._verticalScrollBarController.setScrollPosition(_vPos);
			this._verticalScrollBarController.setScrollSize(vDisplaySize, vEnd);

			this._horizontalScrollBarController.setScrollPosition(_hPos);
			this._horizontalScrollBarController.setScrollSize(hDisplaySize, hEnd);


			// ボックスの表示位置への反映
			var vDisplayPos = vDisplayRange.displayPosition;
			var hDisplayPos = hDisplayRange.displayPosition;

			this._headerColumnsBoxController.setVerticalPosition(vDisplayPos);
			this._headerRowsBoxController.setHorizontalPosition(hDisplayPos);

			this._mainBoxController.setVerticalPosition(vDisplayPos);
			this._mainBoxController.setHorizontalPosition(hDisplayPos);

			var renderRange = {
				rowIndex: vDisplayRange.index,
				rowLength: vDisplayRange.length,
				columnIndex: hDisplayRange.index,
				columnLength: hDisplayRange.length
			};

			// 同じ描画範囲であったら render しない
			if (util.deepEquals(this._renderRange, renderRange)) {
				return;
			}

			this._renderRange = renderRange;
			this._render(renderRange);
		},

		_render: function(renderRange) {
			var focused = document.activeElement;
			var $root = $(this.rootElement);
			if ($root.find(focused) && $(focused).is(':input')) {
				focused.blur();
			}

			var rangeStr = util.toVerboseString(renderRange, 1);
			this.log.trace('Grid Render: {0}', rangeStr);

			var logic = this._gridLogic;

			var headerRows = logic.getHeaderRows();
			var headerColumns = logic.getHeaderColumns();


			var rowIndex = this._renderRange.rowIndex;
			var rowLength = this._renderRange.rowLength;
			var columnIndex = this._renderRange.columnIndex;
			var columnLength = this._renderRange.columnLength;


			var requestParam = {
				headerTopLeft: {
					rowIndex: 0,
					rowLength: headerRows,
					columnIndex: 0,
					columnLength: headerColumns
				},
				headerRows: {
					rowIndex: 0,
					rowLength: headerRows,
					columnIndex: columnIndex,
					columnLength: columnLength
				},
				headerColumns: {
					rowIndex: rowIndex,
					rowLength: rowLength,
					columnIndex: 0,
					columnLength: headerColumns
				},
				main: {
					rowIndex: rowIndex,
					rowLength: rowLength,
					columnIndex: columnIndex,
					columnLength: columnLength
				}
			};

			var request = logic.request(requestParam);


			if (request.isAllDataLoaded()) {
				// 遅延ロード中のものはキャンセルする
				if (this._fetchDebounce.isWaiting()) {
					this._fetchDebounce.cancel();
				}

				var fetchPromise = this._fetchPromise;
				if (fetchPromise != null && fetchPromise.state() === 'pending') {
					this.log.debug('ABORT: fetchData');
					this._fetchPromise.abort();
				}

				// 描画する
				this._renderBoxes(request.getRangeSet());

				// ロード中であればイベントをあげる
				if (this._loading) {
					this.trigger('gridFetchDataSuccess');
					this.trigger('gridFetchDataComplete');
				}

				this._endRender(renderRange);

			} else {
				if (!this._loading) {
					this._renderRange = null;
					this.trigger('gridFetchDataStart');
				}
				this._renderRange = null;

				// ロード中の DOM 表示
				util.map(request.getRangeSet(), this.own(function(range, name) {
					var box = this['_' + name + 'BoxController'];

					// ロード済みである Box はそのまま描画する
					if (range.isAllLoaded()) {
						box.render(range);
						return;
					}

					box.beginLoad();
				}));

				this._fetchDebounce.call(request);
			}
		},

		_fetch: function(request) {
			if (this._fetchPromise != null && this._fetchPromise.state() === 'pending') {
				this.log.debug('ABORT: fetchData');
				this._fetchPromise.abort();
			}

			this.log.debug('START: fetchData');
			this._fetchPromise = request.fetchRangeSet();

			var renderRange = $.extend({}, this._renderRange);

			var success = this.own(function(rangeSet) {
				this.log.debug('SUCCESS: fetchData');
				this._renderBoxes(rangeSet);
				this._endRender(renderRange);
				this.trigger('gridFetchDataSuccess');
			});

			var error = this.own(function(e /*, var_args */) {
				if (e != null && e.isAborted) {
					return;
				}
				this._endRender(renderRange);

				var args = h5.u.obj.argsToArray(arguments);
				this.log.error('FAIL: fetchData; {0}', util.toVerboseString(args, 1));
				this.trigger('gridFetchDataError');
			});


			this._fetchPromise.then(success, error).always(this.own(function() {
				this._fetchPromise = null;

				this.trigger('gridFetchDataComplete');
			}));
		},

		_selectRangeScroll: function(x, y) {
			var hDiff = null;
			if (x <= this._mainLeft + SELECT_RANGE_SCROLL_MARGIN) {
				hDiff = -SELECT_RANGE_SCROLL_PIXEL;
			} else if (this._mainRight - SELECT_RANGE_SCROLL_MARGIN <= x) {
				hDiff = SELECT_RANGE_SCROLL_PIXEL;
			}

			var vDiff = null;
			if (y <= this._mainTop + SELECT_RANGE_SCROLL_MARGIN) {
				vDiff = -SELECT_RANGE_SCROLL_PIXEL;
			} else if (this._mainBottom - SELECT_RANGE_SCROLL_MARGIN <= y) {
				vDiff = SELECT_RANGE_SCROLL_PIXEL;
			}

			var evArg = {};

			if (vDiff != null) {
				evArg.vertical = {
					type: 'scrollDiff',
					diff: vDiff
				};
			}
			if (hDiff != null) {
				evArg.horizontal = {
					type: 'scrollDiff',
					diff: hDiff
				};
			}


			if (this._isSelectStartHeaderColumns && this._mainLeft < x) {
				this._isSelectStartHeaderColumns = false;
				evArg.horizontal = {
					type: 'scrollPosition',
					position: 0
				};
			}

			if (this._isSelectStartHeaderRows && this._mainTop < y) {
				this._isSelectStartHeaderRows = false;
				evArg.vertical = {
					type: 'scrollPosition',
					position: 0
				};
			}


			this.trigger(SCROLL_EVENT_NAME, evArg);

			// 動かない場合に mousemove が発生しないので最初の一回は先に実行しておく
			if (this._gridLogic.isSelectingRange()) {
				var elem = document.elementFromPoint(x, y);

				// 自分で mousemove をおこすと pageX, pageY はとれないので渡す
				$(elem).trigger('mousemove', {
					pageX: x,
					pageY: y
				});
			}
		},


		_renderBoxes: function(gridRangeSet) {
			this._headerTopLeftBoxController.render(gridRangeSet.headerTopLeft);
			this._headerRowsBoxController.render(gridRangeSet.headerRows);
			this._headerColumnsBoxController.render(gridRangeSet.headerColumns);
			this._mainBoxController.render(gridRangeSet.main);
		},

		_makeFormatterSet: function(param) {
			var propertySet = param.propertyUI;

			return util.mapObject(propertySet, this.own(function(propertyParam, property) {
				var formatter = propertyParam.formatter;
				if (typeof formatter === 'undefined') {
					formatter = null;
				} else if ($.isFunction(formatter)) {
					formatter = this.own(formatter);
				}

				return {
					key: property,
					value: formatter
				};
			}));
		},

		_makeSortSet: function(param) {
			var propertySet = param.propertyUI;

			return util.mapObject(propertySet, function(propertyParam, property) {
				var sortable = false;
				if (propertyParam.sortable != null) {
					sortable = propertyParam.sortable;
				}

				var sortProperty = property;
				if (propertyParam.sortProperty != null) {
					sortProperty = propertyParam.sortProperty;
				}

				return {
					key: property,
					value: {
						enable: sortable,
						property: sortProperty
					}
				};
			});
		},

		_makeFilterSet: function(param) {
			var propertySet = param.propertyUI;

			return util.mapObject(propertySet, function(propertyParam, property) {
				var value = {
					enable: false
				};

				if (propertyParam.filter != null) {
					value.enable = true;

					var filter = propertyParam.filter;

					if ($.isArray(filter)) {
						value.type = 'arrayValues';
						value.values = filter;
					} else {
						value.type = filter;
					}
				}

				return {
					key: property,
					value: value
				};
			});
		},

		_registerCellHandler: function(param) {
			var propertySet = param.propertyUI;

			util.forEach(propertySet, this.own(function(propertyParam, property) {
				if (propertyParam.changeHandler == null) {
					return;
				}

				var target = format('[data-h5-dyn-grid-property-name="{0}"]', property);

				// MEMO: change 以外は必要ないのか要検討
				var eventName = 'change';

				var listener = function(context, $el) {
					var row = $el.data('h5DynGridRow');
					var column = $el.data('h5DynGridColumn');

					var cell = this._gridLogic.getGridCell(row, column);

					context.event.stopPropagation();

					this.own(propertyParam.changeHandler)(context, $el, cell);

					$(this.rootElement).focus();
				};

				this.on(target, eventName, listener);
			}));
		},

		_updateRenderer: function() {
			var rendererParam = {
				defaultFormatter: this._param.defaultFormatter,
				formatterSet: this._formatterSet,
				sortSet: this._sortSet,
				filterSet: this._filterSet,
				cellClassDefinition: this._param.cellClassDefinition,
				disableInput: this._param.disableInput,
				resizeColumnUI: this._resizeColumnUIController,
				columnSortAndFilterUI: this._columnSortAndFilterUIController
			};

			var renderer = createTableRenderer(rendererParam);

			this._headerTopLeftBoxController.setRenderer(renderer);
			this._headerRowsBoxController.setRenderer(renderer);
			this._headerColumnsBoxController.setRenderer(renderer);
			this._mainBoxController.setRenderer(renderer);
		},

		_argsValidator: function(suffix) {
			var validateCategory = this.__name + ':' + suffix;
			return util.validator.createArgumentsValidator(validateCategory);
		}

	};


	// TODO: 列入れ替えUI補助コントローラ


	/** @lends h5.ui.components.datagrid.view.dom.cellFormatter */
	var cellFormatter = {

		text: function() {
			return function(cell) {
				if (cell.editedValue == null) {
					return '';
				}
				return escapeHtml(String(cell.editedValue));
			};
		},

		checkbox: function(withHeaderRow) {
			return function(cell, disabledInput) {
				if (!withHeaderRow && cell.isPropertyHeader) {
					return escapeHtml(String(cell.editedValue));
				}
				var html = '<input type="checkbox" tabindex="-1"';
				if (cell.editedValue === true) {
					html += ' checked';
				} else if (cell.isPropertyHeader && this._gridLogic.isSelectedDataAll()) {
					html += ' checked';
				}

				if (disabledInput) {
					html += ' disabled';
				}

				html += '>';
				return html;
			};
		},

		radio: function() {
			return function(cell, disabledInput) {
				if (cell.isPropertyHeader) {
					return escapeHtml(String(cell.editedValue));
				}
				var html = '<input type="radio" tabindex="-1"';
				if (cell.isFocusedData) {
					html += ' checked';
				}

				if (disabledInput) {
					html += ' disabled';
				}

				html += '>';
				return html;
			};
		},

		select: function(options) {
			return function(cell, disabledInput) {
				if (cell.isPropertyHeader) {
					return escapeHtml(String(cell.editedValue));
				}
				var html = '<select tabindex="-1"';

				if (disabledInput) {
					html += ' disabled';
				}

				html += ' style="';
				html += 'width: 100%;';
				html += ' height: 100%;';
				html += ' border-width: 0;';
				html += ' background-color: rgba(0, 0, 0, 0);';
				html += '">';

				util.forEach(options, function(option) {
					var value;
					var text;

					if (util.isPlainObject(option)) {
						value = option.value;
						text = option.text;
					} else {
						value = option;
						text = option;
					}

					html += '<option value="';
					html += escapeHtml(value);
					html += '"';
					if (value === cell.editedValue) {
						html += ' selected';
					}
					html += '>';
					html += escapeHtml(text);
					html += '</option>';
				});

				html += '</select>';
				return html;
			};
		},

		input: function(type) {
			return function(cell, disabledInput) {
				if (cell.isPropertyHeader) {
					return escapeHtml(String(cell.editedValue));
				}
				var _type = (type == null) ? 'text' : type;
				var value = (cell.editedValue == null) ? '' : cell.editedValue;

				var html = '<input tabindex="-1"';

				if (disabledInput) {
					html += ' disabled';
				}

				html += ' style="';
				html += 'width:100%;';
				html += ' height: 100%;';
				html += ' border-style: none;';
				html += ' background-color: rgba(0, 0, 0, 0);';
				html += '"';

				html += ' type="';
				html += _type;
				html += '"';
				html += ' value="';
				html += escapeHtml(String(value));
				html += '">';

				return html;
			};
		}
	};

	var changeHandler = {

		selectData: function() {
			return function(context, $el, cell) {
				var $target = $(context.event.target);
				var isSelected = $target.prop('checked');
				var logic = this._gridLogic;

				if (cell.isPropertyHeader) {
					if (isSelected) {
						logic.selectDataAll();
					} else {
						logic.unselectDataAll();
					}
					return;
				}


				var dataId = cell.dataId;

				if (isSelected) {
					logic.selectData(dataId);
				} else {
					logic.unselectData(dataId);
				}
			};
		},

		focusData: function() {
			return function(context, $el, cell) {
				if (cell.isPropertyHeader) {
					return;
				}

				var $target = $(context.event.target);
				var isFocused = $target.prop('checked');


				if (!isFocused) {
					return;
				}

				var logic = this._gridLogic;
				var dataId = cell.dataId;
				logic.focusData(dataId);
			};
		},

		edit: function(toValue) {
			return function(context, $el, cell) {
				var _toValue = (toValue == null) ? String : toValue;

				var $target = $(context.event.target);

				var value;
				try {
					value = _toValue($target.val());
				} catch (e) {
					this.log.error('toValue() throw Error');
					this.log(e);
					return;
				}

				if (typeof value === 'undefined') {
					return;
				}

				var oldData = cell.editedData;
				var propertyName = cell.propertyName;

				var oldValue = oldData[propertyName];
				if (util.deepEquals(oldValue, value)) {
					return;
				}

				var logic = this._gridLogic;
				var dataSource = logic.getDataSource();

				var builder = dataSource.commandBuilder();
				builder.replaceValue(oldData, propertyName, value);
				var command = builder.toCommand();

				dataSource.edit(command);
			};
		}
	};


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	//=============================
	// Expose to window
	//=============================

	h5.core.expose(verticalScrollBarController);
	h5.core.expose(horizontalScrollBarController);

	h5.core.expose(virtualScrollBoxController);

	h5.core.expose(tableGridViewController);

	h5.u.obj.expose(NAMESPACE, {
		cellFormatter: cellFormatter,
		changeHandler: changeHandler
	});

})();

/* ----- h5.ui.components.datagrid ----- */
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.datagrid';

	/**
	 * @name datagrid
	 * @memberOf h5.ui.components
	 * @namespace
	 */
	h5.u.obj.ns(NAMESPACE);


	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	var DEFAULT_VIEW_PARAM = {
		gridHeight: 'css',
		gridWidth: 'css',
		enableResizeColumnUI: true,
		enableReorderColumnUI: false,
		enableColumnSortUI: false, // TODO: 削除
		enableColumnSortAndFilterUI: true,
		sortAscIconClasses: [],
		sortDescIconClasses: [],
		sortClearIconClasses: [],
		defaultFormatter: h5.ui.components.datagrid.view.dom.cellFormatter.text()
	};


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================

	var datagrid = h5.ui.components.datagrid;
	var util = datagrid.util;
	var type = datagrid.type;


	var dataClass = datagrid.data._privateClass;

	var LocalDataAccessor = dataClass.LocalDataAccessor;
	var AjaxDataAccessor = dataClass.AjaxDataAccessor;
	var DataSource = dataClass.DataSource;


	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	//=============================
	// Function
	//=============================

	/**
	 * @private
	 */
	function argsValidator() {
		return util.validator.createArgumentsValidator(NAMESPACE + ':user');
	}


	/**
	 * @memberOf h5.ui.components.datagrid
	 * @param param パラメータ
	 * @returns {DataSource} データソース
	 */
	function createDataSource(param) {
		var validator = argsValidator();

		validator.arg('param', param, function(v) {
			v.notNull();
			v.plainObject();

			v.property('idProperty', type.validatePropertyName);

			v.or(function(v) {
				v.check('LocalDataSourceParam', function(v) {
					v.property('type', function(v) {
						v.equal('local');
					});
					v.property('param', function(v) {
						v.notNull();
						v.array();
					});
				});

				v.check('AjaxDataSourceParam', function(v) {
					v.property('type', function(v) {
						v.equal('ajax');
					});
					v.property('param', function(v) {
						v.notNull();
						v.plainObject();
					});
				});
			});
		});

		var idProperty = param.idProperty;
		var accessor;

		if (param.type === 'local') {
			var sourceDataArray = param.param;
			accessor = new LocalDataAccessor(idProperty, sourceDataArray);
		} else if (param.type === 'ajax') {
			var ajaxParam = param.param;
			accessor = new AjaxDataAccessor(ajaxParam);
		}

		return new DataSource(idProperty, accessor);
	}


	//=============================
	// Variable
	//=============================


	// =========================================================================
	//
	// Controllers
	//
	// =========================================================================

	//=============================
	// GridController
	//=============================

	/**
	 * Grid を描画するコントローラ
	 *
	 * @class
	 * @name GridController
	 */

	/** @lends GridController# */
	var gridController = {

		// --- Metadata --- //

		/**
		 * @private
		 * @memberOf GridController
		 */
		__name: 'h5.ui.components.datagrid.GridController',


		// --- Child Controller --- //

		// MEMO: あとで view の切り替え方をどうするか考える
		_viewController: datagrid.view.dom.TableGridViewController,


		// --- Logic --- //

		_gridLogic: datagrid.logic.GridLogic,


		// --- Life Cycle Method --- //

		__init: function() {
			this._viewController.setGridLogic(this._gridLogic);
		},

		__dispose: function() {
			this._gridLogic.dispose();
		},


		// --- Public Method --- //

		/**
		 * このコントローラを起動します。
		 *
		 * @param {DataSource} dataSource
		 * @param {GridControllerParam} param
		 * @returns {Promise} 起動を待つ Promise
		 */
		activate: function(dataSource, param) {
			var result = this._parseParam(param);

			this._gridLogic.init(dataSource, result.logicParam);
			return this._viewController.activate(result.viewParam);
		},

		/**
		 * このコントローラの起動を待つ Promise を返します。
		 *
		 * @returns {Promise} 起動を待つ Promise
		 */
		getActivatePromise: function() {
			return this._viewController.getActivatePromise();
		},

		/**
		 * このコントローラが起動しているかを返します。
		 *
		 * @return {boolean} 起動しているか
		 */
		isActive: function() {
			return this._viewController.isActive();
		},

		/**
		 * データ数を返します。
		 *
		 * @returns {Length} データ数
		 */
		getDataCount: function() {
			return this._gridLogic.getDataCount();
		},

		/**
		 * グリッドを再描画します。
		 */
		refresh: function() {
			this._viewController.refresh();
		},

		getVisibleProperties: function() {
			return this._gridLogic.getVisibleProperties();
		},

		resetVisibleProperties: function(visibleProperties) {
			var validator = argsValidator();
			validator.arg('visibleProperties', visibleProperties, type.validateVisibleProperties);

			this._gridLogic.resetVisibleProperties(visibleProperties);
		},

		getFocusedDataId: function() {
			return this._gridLogic.getFocusedDataId();
		},

		focusData: function(dataId) {
			this._gridLogic.focusData(dataId);
		},

		resetDataFocus: function() {
			this._gridLogic.resetDataFocus();
		},

		/**
		 * 指定した ID のデータが選択されているかを返します。
		 *
		 * @param {DataId} dataId データの ID
		 * @returns {boolean} 選択されていれば true、そうでなければ false
		 */
		isSelectedData: function(dataId) {
			return this._gridLogic.isSelectedData(dataId);
		},

		/**
		 * 選択されているデータの一覧を返します。
		 * <p>
		 * このメソッドは遅延でロードする設定の場合はサポートされていません。
		 * </p>
		 *
		 * @returns {Array.<DataId>} 選択されているすべてのデータの ID の配列
		 * @throws 遅延でロードする設定の場合
		 */
		getSelectedDataIdAll: function() {
			return this._gridLogic.getSelectedDataIdAll();
		},

		/**
		 * 選択されているデータを {@DataSelectResult} の形で返します。
		 *
		 * @returns {DataSelectResult} データ選択の結果
		 */
		getDataSelectResult: function() {
			return this._gridLogic.getDataSelectResult();
		},

		/**
		 * 指定されたデータを選択します。
		 *
		 * @param {DataId} dataId 選択するデータのID
		 */
		selectData: function(dataId) {
			this._gridLogic.selectData(dataId);
		},

		/**
		 * すべてのデータを選択します。
		 */
		selectDataAll: function() {
			this._gridLogic.selectDataAll();
		},

		/**
		 * すべてのデータの選択を解除します。
		 */
		unselectDataAll: function() {
			this._gridLogic.unselectDataAll();
		},

		/**
		 * 指定されたデータの選択を解除します。
		 *
		 * @param dataId 解除するデータのID
		 */
		unselectData: function(dataId) {
			this._gridLogic.unselectData(dataId);
		},

		/**
		 * フォーカスされているセルを返します。
		 *
		 * @returns {?CellPosition} フォーカスされたセル
		 */
		getFocusedCell: function() {
			return this._gridLogic.getFocusedCell();
		},

		/**
		 * 選択されているセルの範囲を返します。
		 *
		 * @returns {?CellRange} 選択された範囲
		 */
		getSelectedRange: function() {
			return this._gridLogic.getSelectedRange();
		},

		// TODO: search 変更系
		/**
		 * 検索します。
		 *
		 * @param {Object} param
		 * @param [filter]
		 * @param [sort]
		 */
		search: function(param, filter, sort) {
			var searcher = this._gridLogic.getDataSearcher();
			var oldParam = searcher.getSearchParam();

			var filterParam = filter;
			if (filterParam == null && oldParam != null) {
				filterParam = oldParam.filter;
			}

			var sortParam = sort;
			if (sortParam == null && oldParam != null) {
				sortParam = oldParam.sort;
			}

			var searchParam = $.extend(true, {}, param, {
				filter: filterParam,
				sort: sortParam
			});

			searcher.changeSearchParam(searchParam);
		},

		/**
		 * DataSearcherを返します
		 */
		getDataSearcher: function() {
			return this._gridLogic.getDataSearcher();
		},

		/**
		 * グリッド上のデータをクリアします。
		 */
		clear: function() {
			var searcher = this._gridLogic.getDataSearcher();
			searcher.clear();
		},

		/**
		 * 参照しているデータを取得します。
		 * <p>
		 * このメソッドは同期的に実行され、遅延ロードで読み込まれていないデータは isLoaded が false となりデータが null となります。
		 * </p>
		 *
		 * @returns {Array.<DataReferences>} データへの参照の配列
		 */
		getDataReferences: function() {
			return this._gridLogic.getDataReferences();
		},

		findData: function(dataId) {
			return this._gridLogic.findData(dataId);
		},

		getGridCell: function(row, column) {
			return this._gridLogic.getGridCell(row, column);
		},

		/**
		 * 参照しているデータソースを返します。
		 *
		 * @returns {DataSource} データソース
		 */
		getDataSource: function() {
			return this._gridLogic.getDataSource();
		},

		getSourceDataSet: function() {
			var searcher = this._gridLogic.getDataSearcher();
			return searcher.getSourceDataSet();
		},

		/**
		 * 現在の検索パラメータを返します。
		 *
		 * @returns {SearchParam} 現在の検索パラメータ
		 */
		getSearchParam: function() {
			return this._gridLogic.getSearchParam();
		},

		initSearchParam: function(searchParam) {
			var validator = argsValidator();
			validator.arg('searchParam', searchParam, type.validateSearchParam);

			this._gridLogic.initSearchParam(searchParam);
		},

		/**
		 * データをフェッチする際のパラメータを返します。
		 */
		getFetchParam: function() {
			return this._gridLogic.getDataSearcher().getFetchParam();
		},

		/**
		 * cellClassDefinition をセットします。
		 *
		 * @param {CellClassDefinition} cellClassDefinition
		 */
		setCellClassDefinition: function(cellClassDefinition) {
			this._viewController.setCellClassDefinition(cellClassDefinition);
		},

		/**
		 * disableInput をセットします。
		 *
		 * @param {DisableInputPredicate} disableInput
		 */
		setDisableInput: function(disableInput) {
			this._viewController.setDisableInput(disableInput);
		},

		/**
		 * @returns {boolean}
		 */
		canSetRowHeight: function() {
			return this._gridLogic.canSetRowHeight();
		},

		/**
		 * @returns {PixelSize}
		 */
		getRowHeightMin: function() {
			return this._gridLogic.getRowHeightMin();
		},

		/**
		 * @returns {PixelSize}
		 */
		getRowHeightMax: function() {
			return this._gridLogic.getRowHeightMax();
		},

		/**
		 * @param {Index} row
		 * @param {PixelSize} height
		 */
		setRowHeight: function(row, height) {
			this._gridLogic.setRowHeight(row, height);
		},

		/**
		 * @returns {boolean}
		 */
		canSetColumnWidth: function() {
			return this._gridLogic.canSetColumnWidth();
		},

		/**
		 * @returns {PixelSize}
		 */
		getColumnWidthMin: function() {
			return this._gridLogic.getColumnWidthMin();
		},

		/**
		 * @returns {PixelSize}
		 */
		getColumnWidthMax: function() {
			return this._gridLogic.getColumnWidthMax();
		},

		/**
		 * @param {Index} column
		 * @param {PixelSize} width
		 */
		setColumnWidth: function(column, width) {
			this._gridLogic.setColumnWidth(column, width);
		},

		/**
		 * @param {Index} rowIndex
		 * @param {Length} rowLength
		 * @param {Index} columnIndex
		 * @param {Length} columnLength
		 */
		selectRange: function(rowIndex, rowLength, columnIndex, columnLength) {
			this._gridLogic.selectRange(rowIndex, rowLength, columnIndex, columnLength);
		},

		/**
		 * @param {Index} row
		 * @param {Index} column
		 */
		focusCell: function(row, column) {
			this._gridLogic.focusCell(row, column);
		},

		resetCellSelect: function() {
			this._gridLogic.resetCellSelect();
		},


		// --- Event Handler --- //

		'{this._gridLogic} changeSearchStart': function(context) {
			this.trigger('gridChangeSearchStart', {
				searchParam: context.event.searchParam
			});
		},

		'{this._gridLogic} changeSearchSuccess': function(context) {
			var event = context.event;
			this.trigger('gridChangeSearchSuccess', {
				searchParam: event.searchParam,
				fetchParam: event.fetchParam
			});
		},

		'{this._gridLogic} changeSearchError': function(context) {
			this.trigger('gridChangeSearchError', {
				searchParam: context.event.searchParam,
				cause: context.event.cause
			});
		},

		'{this._gridLogic} changeSearchComplete': function(context) {
			this.trigger('gridChangeSearchComplete', {
				searchParam: context.event.searchParam
			});
		},

		'{this._gridLogic} refreshSearchStart': function() {
			this.trigger('gridRefreshSearchStart');
		},

		'{this._gridLogic} refreshSearchSuccess': function() {
			this.trigger('gridRefreshSearchSuccess');
		},

		'{this._gridLogic} refreshSearchError': function() {
			this.trigger('gridRefreshSearchError');
		},

		'{this._gridLogic} refreshSearchComplete': function() {
			this.trigger('gridRefreshSearchComplete');
		},

		'{this._gridLogic} commitStart': function() {
			this.trigger('gridCommitStart');
		},

		'{this._gridLogic} commitSuccess': function(context) {
			this.trigger('gridCommitSuccess', {
				result: context.event.result
			});
		},

		'{this._gridLogic} commitError': function(context) {
			this.trigger('gridCommitError', {
				args: context.event.args
			});
		},

		'{this._gridLogic} commitComplete': function() {
			this.trigger('gridCommitComplete');
		},


		// --- Private Method --- //

		/**
		 * @private
		 */
		_parseParam: function(param) {
			var validator = argsValidator();
			validator.arg('param', param, function(v) {
				v.notNull();
				v.plainObject();

				v.property('searcher', function(v) {
					v.notNull();
					v.plainObject();

					v.or(function(v) {
						v.check('AllFetchSearcherParam', function(v) {
							v.property('type', function(v) {
								v.notNull();
								v.equal('all');
							});
						});
						v.check('LazyFetchSearcherParam', function(v) {
							v.property('type', function(v) {
								v.notNull();
								v.equal('lazy');
							});
							v.property('property', function(v) {
								v.nullable();
								v.plainObject();

								v.property('fetchUnit', function(v) {
									v.nullable();
									v.integer();
									v.positiveNumber();
								});
							});
						});
					});
					v.property('type', function(v) {
						v.notNull();
						v.any(['all', 'lazy']);
					});
				});

				v.property('mapper', function(v) {
					v.notNull();
					v.plainObject();

					v.property('type', function(v) {
						v.notNull();
						v.any(['property']);
					});

					v.property('param', function(v) {
						v.notNull();
						v.plainObject();

						v.property('direction', type.validateDirectionString);
						v.property('visibleProperties', type.validateVisibleProperties);

						v.property('propertyDirectionSize', function(v) {
							v.nullable();
							type.validatePropertyDirectionSizeParam(v);
						});
						v.property('dataDirectionSize', type.validateDataDirectionSizeParam);
					});
				});

				v.property('scroll', function(v) {
					v.nullable();
					type.validateScrollParam(v);
				});

				v.property('view', function(v) {
					v.notNull();
					v.plainObject();

					v.property('type', function(v) {
						v.notNull();
						v.equal('table');
					});

					v.property('param', function(v) {
						v.notNull();
						v.plainObject();

						v.property('gridHeight', function(v) {
							v.nullable();
							type.validateGridAreaSize(v);
						});
						v.property('gridWidth', function(v) {
							v.nullable();
							type.validateGridAreaSize(v);
						});

						v.property('enableResizeColumnUI', function(v) {
							v.nullable();
							v.type('boolean');
						});
						v.property('enableReorderColumnUI', function(v) {
							v.nullable();
							v.type('boolean');
						});
						v.property('enableColumnSortUI', function(v) {
							v.nullable();
							v.type('boolean');
						});
						v.property('sortAscIconClasses', function(v) {
							v.nullable();
							v.array();
							v.values(function(v) {
								v.notNull();
								v.type('string');
							});
						});
						v.property('sortDescIconClasses', function(v) {
							v.nullable();
							v.array();
							v.values(function(v) {
								v.notNull();
								v.type('string');
							});
						});
						v.property('sortClearIconClasses', function(v) {
							v.nullable();
							v.array();
							v.values(function(v) {
								v.notNull();
								v.type('string');
							});
						});

						v.property('defaultFormatter', function(v) {
							v.nullable();
							type.validateCellFormatter(v);
						});

						v.property('cellClassDefinition', type.validateCellClassDefinition);

						v.property('disableInput', function(v) {
							v.nullable();
							v.func();
						});
					});
				});

				v.property('properties', function(v) {
					v.notNull();
					v.plainObject();

					v.keys(type.validatePropertyName);
					v.values(function(v) {
						v.notNull();
						v.plainObject();
					});
				});
			});

			if (param.scroll == null) {
				param.scroll = {
					vertical: 'pixel',
					horizontal: 'pixel'
				};
			}

			var properties = param.properties;
			var propertyHierarchy;
			if (!!param.propertyHierarchy) {
				propertyHierarchy = param.propertyHierarchy;
			} else {
				propertyHierarchy = util.mapObject(properties, function(definition, property) {
					return {
						key: property,
						value: null
					};
				});
			}

			var viewParam = param.view.param;
			var logicParam = {
				searcher: param.searcher,
				mapper: param.mapper,
				scroll: param.scroll
			};

			var mapperParam = logicParam.mapper.param;
			mapperParam.propertyHierarchy = propertyHierarchy;
			mapperParam.propertyDefinition = properties;

			if (mapperParam.propertyDirectionSize == null) {
				mapperParam.propertyDirectionSize = {
					defaultSize: 100
				};
			}

			viewParam.propertyUI = properties;
			viewParam = $.extend({}, DEFAULT_VIEW_PARAM, viewParam);

			return {
				logicParam: logicParam,
				viewParam: viewParam
			};
		}
	};


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	var exports = {
		createDataSource: createDataSource
	};


	//=============================
	// Expose to window
	//=============================

	h5.u.obj.expose(NAMESPACE, exports);
	h5.core.expose(gridController);

})();
