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
function animate(element, params, option) {

	function clearTransition(_element) {
		element.css(addVenderPrefix({
			'transition-property': '',
			'transition-duration': '',
			'transition-timing-function': ''
		}));
	}

	var _option = $.extend(true, {}, option);
	var isTransition;
	if (_option.isTransition != null) {
		isTransition = _option.isTransition;
	} else {
		isTransition = !(h5.env.ua.isIE && h5.env.ua.browserVersion < 10);
	}
	delete _option.isTransition;

	var easing = _option.easing;
	if (_option.duration == null) {
		_option.duration = 400;
	}

	var complete = null;

	var timer = null;

	if (!isTransition) {
		complete = _option.complete;
		if (/^cubic-bezier/.test(easing)) {
			_option.easing = 'swing';
		} else if (/^ease$|^ease-/.test(easing)) {
			switch (easing) {
			case 'ease-in':
				_option.easing = 'easeInQuad';
				break;
			case 'ease-out':
				_option.easing = 'easeOutQuad';
				break;
			case 'ease-in-out':
				_option.easing = 'easeInOutQuad';
				break;
			case 'ease':
			default:
				_option.easing = 'swing';
			}
		}
		element.stop().animate(params, _option);
	} else {

		clearTransition(element);

		var isCompleted = false;
		complete = function() {
			if (isCompleted)
				return;
			isCompleted = true;
			element.unbind("webkitTransitionEnd", complete);
			element.unbind("transitionend", complete);
			element.unbind("oTransitionEnd", complete);
			clearTransition(element);
			// 同時に複数実行すると、完了イベントが想定通り発生しないケースがある
			// その場合はisTransiionオプションをfalseにしてのjQuery.animateの使用を検討してください。
			if (_option.complete)
				_option.complete();
		};

		var property = '';
		for ( var key in params) {
			element.css(key, element.css(key));
			if (property != '')
				property += ',';
			property += key;
		}

		var duration = _option.duration + 'ms';

		var easing = _option.easing;

		if (easing in animate.E_C) {
			easing = 'cubic-bezier(' + animate.E_C[easing] + ')';
		} else if (easing != 'linear') {
			easing = 'swing';
		}

		element.bind("webkitTransitionEnd", complete);
		element.bind("transitionend", complete);
		element.bind("oTransitionEnd", complete);

		//if(_option.step){
		//	 timer = setInterval(function(){
		//		_option.step();
		//	}, 100);
		//}

		element.css(addVenderPrefix({
			'transition-property': property,
			'transition-duration': duration,
			'transition-timing-function': easing
		}));

		setTimeout(function() {
			element.css(params);
		}, 0);

	}
	return {
		stop: function() {
			if (!isTransition) {
				element.stop();
				complete();
			} else {

				//if(_option.step){
				//	clearTimeout(timer);
				//}

				for ( var key in params) {
					element.css(key, element.css(key));
				}

				complete();
			}
		},
		stopToEnd: function() {
			if (!isTransition) {
				element.css(params);
				complete();
			} else {

				//if(_option.step){
				//	clearTimeout(timer);
				//}

				complete();
			}
		}
	};
}

animate.E_C = {
	'easeInSine': '0.47, 0, 0.745, 0.715',
	'easeOutSine': '0.39, 0.575, 0.565, 1',
	'easeInOutSine': '0.445, 0.05, 0.55, 0.95',
	'easeInQuad': '0.55, 0.085, 0.68, 0.53',
	'easeOutQuad': '0.25, 0.46, 0.45, 0.94',
	'easeInOutQuad': '0.455, 0.03, 0.515, 0.955',
	'easeInCubic': '0.55, 0.055, 0.675, 0.19',
	'easeOutCubic': '0.215, 0.61, 0.355, 1',
	'easeInOutCubic': '0.645, 0.045, 0.355, 1',
	'easeInQuart': '0.895, 0.03, 0.685, 0.22',
	'easeOutQuart': '0.165, 0.84, 0.44, 1',
	'easeInOutQuart': '0.77, 0, 0.175, 1',
	'easeInQuint': '0.755, 0.05, 0.855, 0.06',
	'easeOutQuint': '0.23, 1, 0.32, 1',
	'easeInOutQuint': '0.86, 0, 0.07, 1',
	'easeInExpo': '0.95, 0.05, 0.795, 0.035',
	'easeOutExpo': '0.19, 1, 0.22, 1',
	'easeInOutExpo': '1, 0, 0, 1',
	'easeInCirc': '0.6, 0.04, 0.98, 0.335',
	'easeOutCirc': '0.075, 0.82, 0.165, 1',
	'easeInOutCirc': '0.785, 0.135, 0.15, 0.86',
	'easeInBack': '0.6, -0.28, 0.735, 0.045',
	'easeOutBack': '0.175, 0.885, 0.32, 1.275',
	'easeInOutBack': '0.68, -0.55, 0.265, 1.55'
};

function addVenderPrefix(css, key, isOverride) {
	var _css = (isOverride) ? css : $.extend(true, {}, css);
	if (key) {
		if (typeof key == 'string') {
			key = [key];
		}
		$.each(key, function() {
			if (this in css) {
				_css['-moz-' + this] = css[this];
				_css['-webkit-' + this] = css[this];
				_css['-o-' + this] = css[this];
				_css['-ms-' + this] = css[this];
			}
		});
	} else {
		for ( var i in css) {
			_css['-moz-' + i] = css[i];
			_css['-webkit-' + i] = css[i];
			_css['-o-' + i] = css[i];
			_css['-ms-' + i] = css[i];
		}
		;
	}
	return _css;
}

function convertToTranslate(element, params, option) {

	var _option = $.extend(true, {}, option);
	var _params = $.extend(true, {}, params);
	var isTransform;
	if (_option.isTransform != null) {
		isTransform = _option.isTransform;
	} else {
		//Firefox(18.0.2)で、transformにより縦横同時に移動すると、残像が出るのでデフォルトでは使用しないこととする。
		isTransform = !(h5.env.ua.isIE && h5.env.ua.browserVersion < 10) && !h5.env.ua.isFirefox;
	}
	delete _option.isTransform;

	if (!isTransform)
		return _params;

	var transform = element.css('transform');
	var matrix = null,left,top;

	if (transform) {
		var match = transform.match(/(matrix\((?:[^,]+, *){4})([^,]+), *([^,]+)\)/i);
		if (match) {
			left = _getLT(_params.left, match[2]);
			top = _getLT(_params.top, match[3]);
			matrix = match[1] + left + ', ' + top + ')';
		} else {
			match = transform
					.match(/(matrix3d\((?:[^,]+, *){12})([^,]+), *([^,]+), *((?:[^,]+, *){2}\))/i);
			if (match) {
				left = _getLT(_params.left, match[2]);
				top = _getLT(_params.top, match[3]);
				matrix = match[1] + left + ', ' + top + ', ' + match[4];
			}
		}
	}

	if (!matrix) {
		left = _getLT(_params.left, 0);
		top = _getLT(_params.top, 0);
		matrix = 'matrix(1, 0, 0, 1, ' + left + ', ' + top + ')';
	}

	if (_params.transform) {
		_params.transform += ' ' + matrix;
	} else {
		_params.transform = matrix;
	}

	if (element.css('left') == 'auto') {
		_params.left = 0;
	} else {
		delete _params.left;
	}

	if (element.css('top') == 'auto') {
		_params.top = 0;
	} else {
		delete _params.top;
	}

	return _params;

	function _getLT(value, current) {
		if (value != null) {
			if (typeof value == 'string') {
				var match = value.match(/^([+-])=(-?\d+(?:\.\d*)?)/);
				if (match) {
					return parseFloat(current)
							+ (parseFloat(match[2]) * (match[1] == '+' ? 1 : -1));
				} else {
					return value;
				}
			} else {
				return value;
			}
		} else {
			return current;
		}
	}
}

function moveElement(element, params, option) {
	var _params = convertToTranslate(element, params, option);
	_params = addVenderPrefix(_params, 'transform');
	_params = addPosition(element, _params);
	element.css(_params);
}

function moveElementWithAnimate(element, params, option) {
	var _option = $.extend(true, {}, option);
	var _params = convertToTranslate(element, params, _option);
	_params = addVenderPrefix(_params, 'transform');
	delete _option.isTransform;
	_params = addPosition(element, _params);
	return animate(element, _params, _option);
}

// +=,-=を使用する場合は値はpxである前提とする
function addPosition(element, params) {
	var _params = $.extend(true, {}, params);

	$.each(['left', 'top'], function() {
		if (!(this in _params))
			return;
		var paramsLT = _params[this];
		if (typeof paramsLT != 'string')
			return;
		var match = paramsLT.match(/^([+-])=(-?\d+(?:\.\d*)?)/);
		if (match) {
			var elementLT = element.position()[this];
			_params[this] = elementLT + (parseFloat(match[2]) * (match[1] == '+' ? 1 : -1));
		}
	});

	return _params;
}