// ----- Base Utility ----- //
(function() {
	'use strict';

	// =========================================================================
	//
	// Namespace
	//
	// =========================================================================

	var NAMESPACE = 'h5.ui.components.stage.util';

	/**
	 * @name util
	 * @memberOf h5.ui.components.stage
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

	// =============================
	// Functions
	// =============================

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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
	 */

	/**
	 * collection の各要素に対して callback の処理を実行します。
	 * <p>
	 * callback の引数の順が逆になっていること、null や undefined を渡してもエラーとならないことが、 $.each() と異なります。
	 * </p>
	 *
	 * @public
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
	 * @param {Object} obj
	 * @param {string} name
	 */
	function hasProperty(obj, name) {
		return objectProto.hasOwnProperty.call(obj, name);
	}

	// =============================
	// Variables
	// =============================

	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	// =============================
	// （クラス名）
	// =============================

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

	// =============================
	// Expose to window
	// =============================

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

	var NAMESPACE = 'h5.ui.components.stage.util.validator';

	/**
	 * @name validator
	 * @memberOf h5.ui.components.stage.util
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

	var util = h5.ui.components.stage.util;
	var format = util.formatVerbose;

	var log = h5.log.createLogger(NAMESPACE);

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Functions
	// =============================

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
	 * @memberOf h5.ui.components.stage.util.validator
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
	 * @memberOf h5.ui.components.stage.util.validator
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
	 * @memberOf h5.ui.components.stage.util.validator
	 * @param {string} category 検証のカテゴリ
	 * @returns {ArgumentsValidator} 引数の検証用オブジェクト
	 */
	function createArgumentsValidator(category) {
		return new ArgumentsValidator(category);
	}

	// =============================
	// Variables
	// =============================

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
				// Math.floor() だと Infinity を弾く必要がある
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

	// =============================
	// ValidationContext
	// =============================

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

	// =============================
	// Validator
	// =============================

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

	// =============================
	// ArgumentsValidator
	// =============================

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

	// =============================
	// Expose to window
	// =============================

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

	var NAMESPACE = 'h5.ui.components.stage.util';

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

	var util = h5.ui.components.stage.util;
	var format = util.formatVerbose;

	var log = h5.log.createLogger(NAMESPACE);

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Functions
	// =============================

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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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

	// =============================
	// Variables
	// =============================

	var Mixin = defineInterface('Mixin', ['mix', 'hasInterface']);

	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	// =============================
	// AbstractMethodSet
	// =============================

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

	// =============================
	// Expose to window
	// =============================

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

	var NAMESPACE = 'h5.ui.components.stage.util';

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

	var util = h5.ui.components.stage.util;
	var argsToArray = h5.u.obj.argsToArray;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Functions
	// =============================

	// =============================
	// Variables
	// =============================

	// =========================================================================
	//
	// Mixins
	//
	// =========================================================================

	// =============================
	// OwnSupport
	// =============================

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

	/** @lends h5.ui.components.stage.util */
	var exports = {

		/**
		 * OwnSupport の Mixin です。
		 *
		 * @type Mixin
		 * @memberOf h5.ui.components.stage.util
		 */
		ownSupport: h5.mixin.createMixin(ownSupportModule),

		/**
		 * Disposable の Mixin です。
		 *
		 * @type Mixin
		 * @memberOf h5.ui.components.stage.util
		 */
		disposable: h5.mixin.createMixin(disposableModule)
	};

	// =============================
	// Expose to window
	// =============================

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

	var NAMESPACE = 'h5.ui.components.stage.util';

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

	var util = h5.ui.components.stage.util;

	var argsToArray = h5.u.obj.argsToArray;
	var format = util.formatVerbose;
	var createArgsValidator = util.validator.createArgumentsValidator;
	var createValidator = util.validator.createValidator;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Functions
	// =============================

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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
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
	 * @memberOf h5.ui.components.stage.util
	 * @param {number} firstWait
	 * @param {number} interval
	 * @param {Function} func
	 * @returns {Repeat}
	 */
	function createRepeat(firstWait, interval, func) {
		return new Repeat(firstWait, interval, func);
	}

	// =============================
	// Variables
	// =============================

	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	// =============================
	// ErrorDefinition
	// =============================

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

	// =============================
	// EventListenerSet
	// =============================

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

	// =============================
	// Throttle
	// =============================

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

	// =============================
	// Repeat
	// =============================

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

	/** @lends h5.ui.components.stage.util */
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

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose(NAMESPACE, exports);

})();

(function($) {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================
	var util = h5.ui.components.stage.util;

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

	var DISPLAY_MODE_NONE = 0;
	var DISPLAY_MODE_INVISIBLE = 1;
	var DISPLAY_MODE_AUTO = 2;
	var DISPLAY_MODE_ALWAYS = 3;

	// =============================
	// ScrollBarController
	// =============================

	var verticalScrollBarController = {

		// --- Metadata --- //

		/**
		 * @memberOf VerticalScrollBarController
		 */
		__name: 'h5.ui.components.stage.VerticalScrollBarController',

		// --- Life Cycle Method --- //

		__construct: function() {
			var firstWait = SCROLL_BAR_REPEAT_FIRST_WAIT;
			var interval = SCROLL_BAR_REPEAT_INTERVAL;

			this._displayMode = DISPLAY_MODE_AUTO;

			//トラック部がクリックされたときの移動量を初期化
			//UpとDownは個別に設定できるのでそれぞれ初期化
			this.setUpTrackScrollAmount(null);
			this.setDownTrackScrollAmount(null);

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
				var position = this._position - this._upTrackScrollAmount;
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
				var position = this._position + this._downTrackScrollAmount;
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

		setUpTrackScrollAmount: function(value) {
			if (value == null) {
				this._upTrackScrollAmount = SCROLL_BAR_PRESS_SCROLL_AREA_DIFF;
				return;
			}
			this._upTrackScrollAmount = value;
		},

		setDownTrackScrollAmount: function(value) {
			if (value == null) {
				this._downTrackScrollAmount = SCROLL_BAR_PRESS_SCROLL_AREA_DIFF;
				return;
			}
			this._downTrackScrollAmount = value;
		},

		setDisplayMode: function(displayMode) {
			this._displayMode = displayMode;
			this._updateDisplayState();
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
			if (!this._isActuallyScrollable()) {
				//スクロールバーの表示モードがALWAYSかつスクロール不能な状態のとき、
				//矢印はdisabledでクリックをキャンセルしており、
				//サム(knob)は非表示になっているので
				//トラック部分のイベントをキャンセルすればよい
				return;
			}

			this._isScrollTrackPressing = true;

			this._areaTop = $el.offset().top;
			this._areaTrackPos = context.event.pageY - this._areaTop;

			if (this._areaTrackPos < this._realPosition) {
				this._pressScrollAreaUpRepeat.start();
			} else {
				this._pressScrollAreaDownRepeat.start();
			}
		},

		'.scrollBarScrollArea h5trackmove': function(context) {
			if (!this._isScrollTrackPressing) {
				return;
			}

			this._areaTrackPos = context.event.pageY - this._areaTop;
		},

		'.scrollBarScrollArea h5trackend': function() {
			this._isScrollTrackPressing = false;

			this._areaTop = null;
			this._areaTrackPos = null;

			this._pressScrollAreaUpRepeat.stop();
			this._pressScrollAreaDownRepeat.stop();
		},

		// --- Private Property --- //

		_displayMode: null,

		_isScrollTrackPressing: false,

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

		_upTrackScrollAmount: null,

		_downTrackScrollAmount: null,

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

			this._updateDisplayState();

			this._moveKnob(this._position);
		},

		_isActuallyScrollable: function() {
			return this._scrollSize >= 1;
		},

		_updateDisplayState: function() {
			var $root = this.$find('.' + SCROLL_BAR_BASE_CLASS);

			var isActuallyScrollable = this._isActuallyScrollable();

			switch (this._displayMode) {
			case DISPLAY_MODE_NONE:
				$root.css('display', 'none');
				break;
			case DISPLAY_MODE_INVISIBLE:
				$root.css('visibility', 'hidden');
				break;
			case DISPLAY_MODE_ALWAYS:
				$root.css({
					display: 'block',
					visibility: 'visible'
				});

				if (isActuallyScrollable) {
					$root.removeClass('disabled');
				} else {
					$root.addClass('disabled');
				}

				break;
			case DISPLAY_MODE_AUTO:
			default:
				if (isActuallyScrollable) {
					$root.css({
						display: 'block',
						visibility: 'visible'
					});
				} else {
					$root.css('display', 'none');
				}

				break;
			}
		}
	};

	var horizontalScrollBarController = {

		// --- Metadata --- //

		/**
		 * @memberOf HorizontalScrollBarController
		 */
		__name: 'h5.ui.components.stage.HorizontalScrollBarController',

		// --- Life Cycle Method --- //

		__construct: function() {
			var firstWait = SCROLL_BAR_REPEAT_FIRST_WAIT;
			var interval = SCROLL_BAR_REPEAT_INTERVAL;

			this._displayMode = DISPLAY_MODE_AUTO;

			//Track部分をクリックされたときの移動量を初期化
			//左右個別に設定できるのでそれぞれ初期化
			this.setLeftTrackScrollAmount(null);
			this.setRightTrackScrollAmount(null);

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
				var position = this._position - this._leftTrackScrollAmount;
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
				var position = this._position + this._rightTrackScrollAmount;
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

		setLeftTrackScrollAmount: function(value) {
			if (value == null) {
				this._leftTrackScrollAmount = SCROLL_BAR_PRESS_SCROLL_AREA_DIFF;
				return;
			}
			this._leftTrackScrollAmount = value;
		},

		setRightTrackScrollAmount: function(value) {
			if (value == null) {
				this._rightTrackScrollAmount = SCROLL_BAR_PRESS_SCROLL_AREA_DIFF;
				return;
			}
			this._rightTrackScrollAmount = value;
		},

		setDisplayMode: function(displayMode) {
			this._displayMode = displayMode;
			this._updateDisplayState();
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
			if (!this._isActuallyScrollable()) {
				//スクロールバーの表示モードがALWAYSかつスクロール不能な状態のとき、
				//矢印はdisabledでクリックをキャンセルしており、
				//サム(knob)は非表示になっているので
				//トラック部分のイベントをキャンセルすればよい
				return;
			}

			this._isScrollTrackPressing = true;

			this._areaLeft = $el.offset().left;
			this._areaTrackPos = context.event.pageX - this._areaLeft;

			if (this._areaTrackPos < this._realPosition) {
				this._pressScrollAreaLeftRepeat.start();
			} else {
				this._pressScrollAreaRightRepeat.start();
			}
		},

		'.scrollBarScrollArea h5trackmove': function(context) {
			if (!this._isScrollTrackPressing) {
				return;
			}

			this._areaTrackPos = context.event.pageX - this._areaLeft;
		},

		'.scrollBarScrollArea h5trackend': function() {
			this._isScrollTrackPressing = false;

			this._areaLeft = null;
			this._areaTrackPos = null;

			this._pressScrollAreaLeftRepeat.stop();
			this._pressScrollAreaRightRepeat.stop();
		},

		// --- Private Property --- //

		_displayMode: null,

		_isScrollTrackPressing: false,

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

		_leftTrackScrollAmount: null,

		_rightTrackScrollAmount: null,

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

			this._updateDisplayState();

			this._moveKnob(this._position);
		},

		_isActuallyScrollable: function() {
			return this._scrollSize >= 1;
		},

		_updateDisplayState: function() {
			var $root = this.$find('.' + SCROLL_BAR_BASE_CLASS);

			var isActuallyScrollable = this._isActuallyScrollable();

			switch (this._displayMode) {
			case DISPLAY_MODE_NONE:
				$root.css('display', 'none');
				break;
			case DISPLAY_MODE_INVISIBLE:
				$root.css('visibility', 'hidden');
				break;
			case DISPLAY_MODE_ALWAYS:
				$root.css({
					display: 'block',
					visibility: 'visible'
				});

				if (isActuallyScrollable) {
					$root.removeClass('disabled');
				} else {
					$root.addClass('disabled');
				}

				break;
			case DISPLAY_MODE_AUTO:
			default:
				if (isActuallyScrollable) {
					$root.css({
						display: 'block',
						visibility: 'visible'
					});
				} else {
					$root.css('display', 'none');
				}

				break;
			}
		}
	};

	h5.core.expose(verticalScrollBarController);
	h5.core.expose(horizontalScrollBarController);
})(jQuery);
