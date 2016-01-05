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

(function($) {
	// 二重読み込み防止
	if (!window.h5) {
		// hifive自体がロードされていないので、ロードを中止する
		return;
	} else if (h5.devtool) {
		// 既にロード済みならロードを中止する
		return;
	}

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Settings
	//
	// =========================================================================
	/**
	 * window.openで開くかどうか。 <br>
	 * window.openで開く場合はtrue、ページ上に表示(iframe版)ならfalse
	 */
	//	TODO 今は必ずwindow.open()を使用するようにしている(タブレットでもwindow.open()で動作する。)
	// iframe版を使用することがもうないならソースコードを修正する。
	var useWindowOpen = true;

	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	/** DvelopperToolのバージョン */
	var H5_DEV_TOOL_VERSION = '1.0.0';
	/** ログのインデント幅 */
	var LOG_INDENT_WIDTH = 10;
	/** ログ出力の遅延時間(ms) */
	var LOG_DELAY = 100;
	/** ログ出力の最大遅延時間(ms) */
	var MAX_LOG_DELAY = 500;
	/** ライフサイクルメソッド(表示する順番で記述) */
	var LIFECYCLE_METHODS = ['__construct', '__init', '__ready', '__unbind', '__dispose'];
	/** オーバレイのボーダーの幅 */
	var OVERLAY_BORDER_WIDTH = 3;

	/**
	 * ディベロッパツールのスタイル
	 */
	var H5DEVTOOL_STYLE = [
			{
				selector: '.h5devtool',
				rule: {
					backgroundColor: 'rgba(255,255,255,0.8)', // iframe版を考慮して背景に透過指定
					height: '100%',
					width: '100%',
					margin: 0,
					padding: 0,
					zIndex: 20000
				}
			},
			{
				selector: '.h5devtoolHTML', // IE8-用にHTML要素にもスタイルを当てる
				rule: {
					height: '100%',
					width: '100%',
					margin: 0,
					padding: 0,
					overflow: 'hidden' // IE7でスクロールバーが出てしまうためoverflow:hiddenを指定する
				}
			},
			{
				selector: '.h5devtool.posfix',
				rule: {
					position: 'fixed',
					top: 0,
					left: 0
				}
			},
			{
				// 高さ100%で、中身が多いときはスクロールバーを出すスタイルのリスト
				selector: '.h5devtool .floating-list',
				rule: {
					height: '100%',
					overflow: 'auto'
				}
			},
			{
				selector: '.h5devtool .devtool-tab',
				rule: {
					height: '100%'
				}
			},
			{
				selector: '.h5devtool-upper-right',
				rule: {
					position: 'fixed',
					zIndex: 20001,
					top: 0,
					left: '810px',
					width: '100px',
					textAlign: 'right'
				}
			},
			{
				selector: '.h5devtool .liststyle-none',
				rule: {
					listStyle: 'none'
				}
			},
			{
				selector: '.h5devtool .no-padding',
				rule: {
					padding: '0!important'
				}
			},
			/*
			 * 汎用スタイル
			 */
			{
				selector: '.h5devtool .font-small',
				rule: {
					fontSize: '0.8em'
				}
			},
			/*
			 * トレースログ
			 */
			{
				selector: '.h5devtool .trace',
				rule: {
					paddingBottom: '60px' // .fixedControllsの高さ
				}
			},
			{
				selector: '.h5devtool .trace .lifecycleColor',
				rule: {
					color: '#15A2E3',
					borderColor: '#15A2E3'
				}
			},
			{
				selector: '.h5devtool .trace .publicColor',
				rule: {
					color: '#31A120',
					borderColor: '#31A120'
				}
			},
			{
				selector: '.h5devtool .trace .privateColor',
				rule: {
					color: '#4A370C',
					borderColor: '#4A370C'
				}
			},
			{
				selector: '.h5devtool .trace .eventColor',
				rule: {
					color: '#861EC2',
					borderColor: '#861EC2'
				}
			},
			{
				selector: '.h5devtool .trace .fixedControlls label',
				rule: {
					margin: '0 2px 4px 0',
					borderWidth: '0 0 3px 0',
					borderStyle: 'solid',
					display: 'inline-block'
				}
			},
			{
				selector: '.h5devtool .trace .fixedControlls',
				rule: {
					paddingLeft: 0,
					margin: 0,
					backgroundColor: '#fff',
					border: 'solid 1px gray',
					padding: '3px',
					height: '60px',
					'-moz-box-sizing': 'border-box',
					'-webkit-box-sizing': 'border-box',
					boxSizing: 'border-box'
				}
			},
			{
				selector: '.h5devtool .trace-list',
				rule: {
					paddingLeft: 0,
					margin: 0,
					color: 'gray',
					whiteSpace: 'nowrap'
				}
			},
			{
				selector: '.h5devtool .trace-list>li.selected',
				rule: {
					backgroundColor: '#ddd'
				}
			},
			{
				selector: '.h5devtool .trace-list>li .time',
				rule: {
					marginRight: '1em'
				}
			},
			{
				selector: '.h5devtool .trace-list>li .tag',
				rule: {
					display: 'inline-block',
					minWidth: '3em'
				}
			},
			{
				selector: '.h5devtool .trace-list>li .promiseState',
				rule: {
					display: 'inline-block',
					marginRight: '0.5em'
				}
			},
			/*
			 * ロガー
			 */
			{
				selector: '.h5devtool .logger p',
				rule: {
					margin: '4px 0 0 2px',
					borderTop: '1px solid #eee',
					fontSize: '12px'
				}
			},
			{
				selector: '.h5devtool .logger p.TRACE',
				rule: {
					color: '#000000'
				}
			},
			{
				selector: '.h5devtool .logger p.DEBUG',
				rule: {
					color: '#0000ff'
				}
			},
			{
				selector: '.h5devtool .logger p.INFO',
				rule: {
					color: '#000000'
				}
			},
			{
				selector: '.h5devtool .logger p.WARN',
				rule: {
					color: '#0000ff'
				}
			},
			{
				selector: '.h5devtool .logger p.ERROR',
				rule: {
					color: '#ff0000'
				}
			},
			{
				selector: '.h5devtool .logger p.EXCEPTION',
				rule: {
					color: '#ff0000',
					fontWeight: 'bold'
				}
			},
			/*
			 * カラムレイアウトをコンテンツに持つタブコンテンツのラッパー
			 * 各カラムでスクロールできればいいので、外側はoverflow:hidden
			 */
			{
				selector: '.h5devtool .columnLayoutWrapper',
				rule: {
					overflow: 'hidden!important'
				}
			},
			/*
			 * コントローラ情報表示箇所
			 */{
				selector: '.h5devtool .controller-info .controll',
				rule: {
					paddingLeft: '30px'
				}
			},
			/*
			 * コントローラ情報の詳細
			 */{
				selector: '.h5devtool .controller-info .instance-detail',
				rule: {
					height: '100%'
				}
			},
			/*
			 * コントローラ・ロジックリスト
			 */
			{
				selector: '.h5devtool .controller-info .targetlist',
				rule: {
					paddingTop: 0,
					paddingLeft: '1.2em',
					// IE7用
					'*paddingLeft': 0,
					'*position': 'relative',
					'*left': '-1.2em'
				}
			},
			{
				selector: '.h5devtool .controller-info .targetlist .target-name',
				rule: {
					cursor: 'default'
				}
			},
			{
				selector: '.h5devtool .controller-info .targetlist .target-name.selected',
				rule: {
					background: 'rgb(170,237,255)!important'
				}
			},
			{
				selector: '.h5devtool .controller-info .targetlist .target-name:hover',
				rule: {
					background: 'rgb(220,247,254)'
				}
			},

			/*
			 * イベントハンドラ
			 */
			{
				selector: '.h5devtool .eventHandler .fixedController',
				rule: {
					height: '24px'
				}
			},
			{
				selector: '.h5devtool .eventHandler',
				rule: {
					paddingBottom: '24px' // .fixedControllsの高さ
				}
			},
			{
				selector: '.h5devtool .controller-info .eventHandler ul',
				rule: {
					listStyle: 'none',
					margin: 0
				}
			},
			{
				selector: '.h5devtool .controller-info .eventHandler ul li .name',
				rule: {
					lineHeight: '28px'
				}
			},
			{
				selector: '.h5devtool .controller-info .eventHandler li.selected',
				rule: {
					background: 'rgb(203,254,231)'
				}
			},
			/*
			 * メソッドリスト
			 */
			{
				selector: '.h5devtool .method .fixedController',
				rule: {
					height: '24px'
				}
			},
			{
				selector: '.h5devtool .method',
				rule: {
					paddingBottom: '24px' // .fixedControllsの高さ
				}
			},
			{
				selector: '.h5devtool .method-list',
				rule: {
					listStyle: 'none',
					margin: 0,
					// IE7用
					'*padding-right': '16px!important' // スクロールバーの下に隠れることがあるので右側にその分パディングを取る
				}
			},
			{
				selector: '.h5devtool .method-list .nocalled',
				rule: {
					// マルチブラウザ対応
					background: [
							'-webkit-gradient(linear, left top, right top, color-stop(0.95, #C3E0EF), color-stop(0.00, #F5FBFE))',
							'-webkit-linear-gradient(left, #C3E0EF 0%, #F5FBFE 95%)',
							'-moz-linear-gradient(left, #C3E0EF 0%, #F5FBFE 95%);',
							'-o-linear-gradient(left, #C3E0EF 0%, #F5FBFE 95%)',
							'-ms-linear-gradient(left, #C3E0EF 0%, #F5FBFE 95%)',
							'linear-gradient(left, #C3E0EF 0%, #F5FBFE 95%)']

				}
			},
			{
				selector: '.h5devtool .method-list .called',
				rule: {
					// マルチブラウザ対応
					background: [
							'-webkit-gradient(linear, left top, right top, color-stop(0.95, #6EB7DB), color-stop(0.00, #C3E0EF))',
							'-webkit-linear-gradient(left, #6EB7DB 0%, #C3E0EF 95%)',
							'-moz-linear-gradient(left, #6EB7DB 0%, #C3E0EF 95%);',
							'-o-linear-gradient(left, #6EB7DB 0%, #C3E0EF 95%)',
							'-ms-linear-gradient(left, #6EB7DB 0%, #C3E0EF 95%)',
							'linear-gradient(left, #6EB7DB 0%, #C3E0EF 95%)']

				}
			}, {
				// 点滅させるときのスタイル
				selector: '.h5devtool .method-list .blink',
				rule: {
					background: '#FF9617'
				}
			},
			/*
			 * その他情報
			 */
			{
				selector: '.h5devtool .controller-info .otherInfo ul',
				rule: {
					margin: 0
				}
			}, {
				selector: '.h5devtool .controller-info .otherInfo dt',
				rule: {
					fontWeight: 'bold',
					margin: '5px 0 5px 5px'
				}
			}, {
				selector: '.h5devtool .method-list .count',
				rule: {
					'float': 'right',
					fontWeight: 'bold',
					fontSize: '30px',
					position: 'relative',
					top: '16px',
					right: '10px',
					color: '#888'
				}
			}, {
				selector: '.h5devtool .method-list pre',
				rule: {
					margin: '0 0 10px',
					padding: '4px',
					wordBreak: 'break-all',
					wordWrap: 'break-word',
					whiteSpace: 'pre',
					whiteSpace: 'pre-wrap',
					background: 'rgb(250,250,250)',
					border: '1px solid rgb(213,213,213)',
					'-webkit-border-radius': '4px',
					'-moz-border-radius': '4px',
					borderRadius: '4px',
					fontFamily: 'Monaco,Menlo,Consolas,"Courier New",monospace',
					fontSize: '12px'
				}
			}, {
				selector: '.h5devtool .controller-info .detail',
				rule: {
					overflow: 'auto'
				}
			}, {
				selector: '.h5devtool .ovfAuto',
				rule: {
					overflow: 'auto'
				}
			}, {
				selector: '.h5devtool .ovfHidden',
				rule: {
					overflow: 'hidden'
				}
			}, {
				selector: '.h5devtool .left',
				rule: {
					'float': 'left',
					height: '100%',
					maxWidth: '350px',
					border: '1px solid #20B5FF',
					'-moz-box-sizing': 'border-box',
					'-webkit-box-sizing': 'border-box',
					boxSizing: 'border-box',
					// IE7用
					'*position': 'absolute',
					'*height': 'auto',
					'*top': 0,
					'*left': 0,
					'*bottom': 0,
					'*width': '350px'
				}
			}, {
				selector: '.h5devtool .right',
				rule: {
					height: '100%',
					border: '1px solid #20B5FF',
					borderLeft: 'none',
					'-moz-box-sizing': 'border-box',
					'-webkit-box-sizing': 'border-box',
					boxSizing: 'border-box',
					// IE7用
					'*position': 'absolute',
					'*height': 'auto',
					'*width': 'auto',
					'*top': 0,
					'*left': '350px',
					'*right': 0,
					'*bottom': 0
				}
			}, {
				selector: '.h5devtool .eventHandler .menu',
				rule: {
					display: 'none'
				}
			}, {
				selector: '.h5devtool .eventHandler .menu>*',
				rule: {
					display: 'inline-block'
				}
			}, {
				selector: '.h5devtool .eventHandler .selected .menu',
				rule: {
					display: 'inline-block'
				}
			},
			/*
			 * タブ
			 */
			{
				selector: '.h5devtool ul.nav-tabs',
				rule: {
					listStyle: 'none',
					width: '100%',
					margin: 0,
					padding: 0,
					'float': 'left'

				}
			}, {
				selector: '.h5devtool ul.nav-tabs>li',
				rule: {
					'float': 'left',
					padding: '3px',
					border: '1px solid #ccc',
					color: '#20B5FF',
					marginLeft: '-1px',
					cursor: 'pointer'
				}
			}, {
				selector: '.h5devtool ul.nav-tabs>li.active',
				rule: {
					color: '#000',
					borderBottom: 'none'
				}
			}, {
				selector: '.h5devtool .tab-content',
				rule: {
					marginTop: '-1px',
					width: '100%',
					height: '100%',
					paddingBottom: '30px',
					'-moz-box-sizing': 'border-box',
					'-webkit-box-sizing': 'border-box',
					boxSizing: 'border-box',
					// IE7用
					'*position': 'absolute',
					'*height': 'auto',
					'*top': '26px',
					'*left': 0,
					'*bottom': 0,
					'*right': '20px',
					'*paddingBottom': 0,
					'*overflow-y': 'auto',
					'*overflow-x': 'hidden'
				}
			}, {
				selector: '.h5devtool .tab-content>*',
				rule: {
					overflow: 'auto',
					'float': 'left',
					height: 'inherit',
					width: '100%',
					paddingLeft: 0,
					margin: 0,
					height: '100%',
					'-moz-box-sizing': 'border-box',
					'-webkit-box-sizing': 'border-box',
					boxSizing: 'border-box'
				}
			}, {
				// fixedControllerを持つコンテンツ
				selector: '.h5devtool .tab-content>*.hasfix',
				rule: {
					overflow: 'visible!important'
				}
			}, {
				selector: '.h5devtool .tab-content>*',
				rule: {
					display: 'none'
				}
			}, {
				selector: '.h5devtool .tab-content>.active',
				rule: {
					display: 'block'
				}
			},
			// ドロップダウンメニュー(bootstrapから流用)
			{
				selector: '.h5devtool .dropdown-menu',
				rule: {
					position: ' absolute',
					top: '100%',
					left: '0',
					'z-index': '1000',
					display: 'none',
					'float': 'left',
					'min-width': '160px',
					padding: '5px 0',
					margin: '2px 0 0',
					'list-style': 'none',
					'background-color': '#fff',
					border: '1px solid #ccc',
					border: '1px solid rgba(0,0,0,0.2)',
					'-webkit-border-radius': '6px',
					'-moz-border-radius': '6px',
					'border-radius': '6px',
					'-webkit-box-shadow': '0 5px 10px rgba(0,0,0,0.2)',
					'-moz-box-shadow': '0 5px 10px rgba(0,0,0,0.2)',
					'box-shadow': '0 5px 10px rgba(0,0,0,0.2)',
					'-webkit-background-clip': 'padding-box',
					'-moz-background-clip': 'padding',
					'background-clip': 'padding-box'
				}
			}, {
				selector: '.h5devtool .dropdown-menu li',
				rule: {
					fontSize: '0.8em',
					padding: '8px',
					cursor: 'pointer'
				}
			}, {
				selector: '.h5devtool .dropdown-menu li:hover',
				rule: {
					backgroundColor: '#eee'
				}
			}];

	var MOBILE_STYLE = {
		// モバイルの時だけ適用するスタイルを設定します
		selector: '.h5devtool .trace-list>li',
		rule: {
			lineHeight: '2em'
		}
	};

	var SPECIAL_UA_H5DEVTOOL_STYLE = {
	//		// h5.env.ua[property]がtrueの時のスタイルを設定します。
	//		// h5.env.ua.isIEがtrueの時に設定するスタイルは、"isIE"というプロパティでスタイルを定義します。
	//		isIE: [{
	//			// スタイルの調整(IE用)
	//			// IEだと、親要素とそのさらに親要素がpadding指定されているとき、height:100%の要素を置くと親の親のpadding分が無視されている？
	//			// その分を調整する。
	//			selector: '.h5devtool .tab-content .tab-content',
	//			rule: {
	////				paddingBottom: '60px'
	//			}
	//		}]
	};
	/**
	 * 元ページ側のスタイル
	 */
	var H5PAGE_STYLE = [{
		selector: '.h5devtool-overlay, .h5devtool-overlay *',
		rule: {
			position: 'absolute',
			zIndex: 10000,
			'-moz-box-sizing': 'border-box',
			'-webkit-box-sizing': 'border-box',
			boxSizing: 'border-box'
		}
	}, {
		selector: '.h5devtool-overlay .body',
		rule: {
			height: '100%',
			width: '100%',
			opacity: '0.2',
			filter: 'alpha(opacity=20)',
			backgroundColor: 'rgb(64, 214, 255)'
		}
	}, {
		selector: '.h5devtool-overlay.event-target .body',
		rule: {
			backgroundColor: 'rgb(128,255,198)'
		}
	}, {
		selector: '.h5devtool-overlay .border',
		rule: {
			opacity: '0.3',
			filter: 'alpha(opacity=30)',
			position: 'absolute',
			borderTopWidth: '3px',
			borderLeftWidth: '3px',
			borderBottomWidth: 0,
			borderRightWidth: 0
		}
	}, {
		selector: '.h5devtool-overlay.root .border',
		rule: {
			borderStyle: 'solid',
			borderColor: 'rgb(64, 214, 255)'
		}
	}, {
		selector: '.h5devtool-overlay.child .border',
		rule: {
			borderStyle: 'dashed',
			borderColor: 'rgb(64, 214, 255)'
		}
	}, {
		selector: '.h5devtool-overlay.event-target .border',
		rule: {
			borderStyle: 'dashed',
			borderColor: 'rgb(128,255,198)'
		}
	}, {
		selector: '.h5devtool-overlay.borderOnly .body',
		rule: {
			display: 'none'
		}
	}, {
		selector: '.h5devtool-overlay.borderOnly',
		rule: {
			height: '0!important',
			width: '0!important'
		}
	}];

	// =========================================================================
	//
	// Scoped Privates
	//
	// =========================================================================
	// =============================
	// View
	// =============================
	/**
	 * ディベロッパツールで使用するview
	 */
	var view = h5.core.view.createView();
	// モバイル、タブレット用のラッパー。
	view
			.register(
					'wrapper',
					'<div class="h5devtool-upper-right"><div class="h5devtool-controllBtn showhideBtn hideTool">↑</div><div class="h5devtool-controllBtn opencloseBtn closeTool">×</div></div><div class="h5devtool posfix" style="position:fix; left:0; top:0;"></div>');

	// ルートのタブ
	view.register('devtool-tab', '<div class="devtool-tab"><ul class="nav nav-tabs">'
			+ '<li class="active" data-tab-page="controller-info">コントローラ</li>'
			+ '<li data-tab-page="trace">トレース</li>' + '<li data-tab-page="logger">ロガー</li>'
			+ '<li data-tab-page="settings">設定</li>' + '</ul><div class="tab-content">'
			+ '<div class="active controller-info columnLayoutWrapper"></div>'
			+ '<div class="trace whole hasfix"></div>' + '<div class="logger"></div>'
			+ '<div class="settings"></div>' + '</div>');

	// --------------------- コントローラ --------------------- //
	// コントローラ情報表示画面
	view.register('controllerInfoWrapper',
			'<div class="left ovfAuto"></div><div class="right ovfHidden"></div>');

	// コントローラリストul
	view.register('target-list', '<ul class="targetlist"></ul>');

	// コントローラリストli
	view.register('target-list-part',
			'<li><span class="target-name [%= cls %]">[%= name %]</span></li>');

	// 詳細情報画面
	view.register('controller-detail',
			'<div class="detail instance-detail controller-detail"><ul class="nav nav-tabs">'
					+ '<li class="active" data-tab-page="eventHandler">イベントハンドラ</li>'
					+ '<li data-tab-page="method">メソッド</li>'
					+ '<li data-tab-page="trace">トレース</li>'
					+ '<li data-tab-page="otherInfo">その他情報</li></ul><div class="tab-content">'
					+ '<div class="active eventHandler hasfix"></div>'
					+ '<div class="method hasfix"></div>' + '<div class="trace hasfix"></div>'
					+ '<div class="otherInfo"></div></div>');

	// イベントハンドラリスト
	view
			.register(
					'eventHandler-list',
					'<div class="fixedControlls">[% if(eventHandlers.length){ %]<select class="method-select"></select></div><ul class="liststyle-none no-padding method-list floating-list">[% for(var i = 0, l = eventHandlers.length; i < l; i++){ var p = eventHandlers[i]; %]'
							+ '<li class="[%= (methodCount.get(p)?"called":"nocalled") %]"><span class="menu">ターゲット:<select class="eventTarget"></select><button class="trigger">実行</button></span>'
							+ '<span class="name">[%= p %]</span><span class="count">[%= methodCount.get(p) %]</span><pre class="value">[%= _funcToStr(controller[p]) %]</pre></li>'
							+ '[% } %]</ul>[% } else { %]<p>なし</p>[% } %]');

	// メソッドリスト(コントローラ、ロジック、共通)
	view
			.register(
					'method-list',
					'<div class="fixedControlls"><select class="method-select"></select></div><ul class="liststyle-none no-padding method-list floating-list">[% for(var i = 0, l = methods.length; i < l; i++){ var p = methods[i];%]'
							+ '<li class="[%= (methodCount.get(p)?"called":"nocalled") %]"><span class="name">[%= p %]</span><span class="count">[%= methodCount.get(p) %]</span><pre class="value">[%= _funcToStr(defObj[p]) %]</pre></li>'
							+ '[% } %]</ul>');
	// その他情報
	view
			.register(
					'controller-otherInfo',
					'<dl><dt>名前</dt><dd>[%= controller.__name %]</dd>'
							+ '<dt> ルートコントローラか</dt><dd>[%= controller.__controllerContext.isRoot %]</dd>'
							+ '<dt>ルート要素</dt><dd>[%= _formatDOM(controller.rootElement)  %]</dd>'
							+ '<dt>ルートコントローラ</dt><dd>[%= controller.rootController.__name %]</dd>'
							+ '<dt>親コントローラ</dt><dd>[%= controller.parentController && controller.parentController.__name || "なし" %]</dd>'
							+ '<dt>子コントローラ一覧</dt><dd>[% if(!childControllerNames.length){ %]なし'
							+ '[% }else{ %]<ul class="no-padding">[% for(var i = 0, l = childControllerNames.length; i < l; i++){ %]<li>[%= childControllerNames[i] %]</li>[% } %]</ul>[% } %]</dd>'
							+ '<dt>テンプレートパス一覧</dt><dd>[% if(!controller.__templates){ %]なし'
							+ '[% }else{ %]<ul class="no-padding">[% var templates = typeof controller.__templates === "string"? [controller.__templates]: controller.__templates; '
							+ 'for(var i = 0, l = templates.length; i < l; i++){ %]<li>[%= templates[i] %]</li>[% } %]</ul>[% } %]</dd>'
							+ '<dt>このコントローラで登録されたテンプレートID一覧</dt><dd>[% if(registedTemplates.length === 0){ %]なし'
							+ '[% }else{ %][%= registedTemplates.join(", ") %][% } %]</dd>'
							+ '<dt>利用可能なテンプレートID一覧</dt><dd>[% if(availableTemplates.length === 0){ %]なし'
							+ '[% }else{ %][%= availableTemplates.join(", ") %][% } %]</dd>'
							+ '</dl>');

	// --------------------- ロジック --------------------- //

	// 詳細情報画面
	view.register('logic-detail',
			'<div class="detail instance-detail logic-detail"><ul class="nav nav-tabs">'
					+ '<li class="active" data-tab-page="method">メソッド</li>'
					+ '<li data-tab-page="trace">トレース</li>'
					+ '<li data-tab-page="otherInfo">その他情報</li></ul><div class="tab-content">'
					+ '<div class="active method hasfix"></div>'
					+ '<div class="trace hasfix"></div>' + '<div class="otherInfo"></div></div>');

	// その他情報
	view.register('logic-otherInfo', '<dl><dt>名前</dt><dd>[%= defObj.__name %]</dd>'
			+ '<dt>ロジックインスタンスの名前</dt><dd>[%= instanceName %]</dd>' + '</dl>');

	// トレースログ(コントローラ、ロジック、全体、で共通)
	view
			.register(
					'trace',
					'<div class="fixedControlls">'
							+ '<label class="event eventColor"><input type="checkbox" checked name="event"/>イベント</label>'
							+ '<label class="public publicColor"><input type="checkbox" checked name="public" />パブリック</label>'
							+ '<label class="private privateColor"><input type="checkbox" checked name="private" />プライベート</label>'
							+ '<label class="lifecycle lifecycleColor"><input type="checkbox" checked name="lifecycle"/>ライフサイクル</label>'
							+ '<br>'
							+ '<input type="text" class="filter"/><button class="filter-show">絞込み</button><button class="filter-hide">除外</button><button class="filter-clear" disabled>フィルタ解除</button>'
							+ '<span class="font-small">（ログを右クリックまたはタッチで関数にジャンプ）</span></div>'
							+ '<ul class="trace-list liststyle-none no-padding floating-list" data-h5-loop-context="logs"></ul>'
							+ '<ul class="contextMenu logContextMenu dropdown-menu"><li class="showFunction"><span>関数を表示</span></li></ul>');

	// トレースログのli
	view.register('trace-list-part', '<li class=[%= cls %]>'
			+ '<span class="time">[%= time %]</span>'
			+ '<span style="margin-left:[%= indentWidth %]px" class="tag">[%= tag %]</span>'
			+ '<span class="promiseState">[%= promiseState %]</span>'
			+ '<span class="message [%= cls %] [%= cls %]Color">[%= message %]</span></li>');


	// オーバレイ
	view
			.register(
					'overlay',
					'<div class="h5devtool-overlay [%= cls %]"><div class="body"></div><div class="border top"></div><div class="border right"></div><div class="border bottom"></div><div class="border left"></div></div>');

	// --------------------- デバッガ設定 --------------------- //
	view
			.register(
					'settings',
					'<label for="h5devtool-setting-LogMaxNum">ログの最大表示件数</label>'
							+ '<input type="text" id="h5devtool-setting-LogMaxNum" data-h5-bind="attr(value):LogMaxNum" name="LogMaxNum"/><button class="set">設定</button>');
	// =============================
	// Variables
	// =============================

	/**
	 * ディベロッパツールで使用するロガー
	 */
	var fwLogger = h5.log.createLogger('h5.devtool');

	/**
	 * ディベロッパツールで使用するウィンドウ。window.openなら開いたウィンドウで、そうじゃなければページのwindowオブジェクト。
	 */
	var devtoolWindow = null;

	/**
	 * ディベロッパウィンドウが閉じられたかどうかのフラグ
	 */
	var isDevtoolWindowClosed = false;

	var h5devtoolSettings = h5.core.data.createObservableItem({
		LogMaxNum: {
			type: 'integer',
			defaultValue: 1000,
			constraint: {
				notNull: true,
				min: 0
			}
		}
	});

	/**
	 * タッチイベントがあるか
	 */
	var hasTouchEvent = document.ontouchstart !== undefined;

	/**
	 * ログ用のObservableArrayを要素に持つ配列
	 */
	var logArrays = [];

	/**
	 * コントローラ、ロジック、全体のログ
	 */
	var wholeTraceLogs = createLogArray();
	var wholeTraceLogsIndentLevel = 0;

	/**
	 * コンソール出力のログ
	 */
	var loggerArray = createLogArray();

	/**
	 * アスペクトが掛かっていて元の関数が見えない時に代用する関数
	 */
	var DUMMY_NO_VISIBLE_FUNCTION = function() {
	// ダミー
	};

	/**
	 * アスペクトのかかった関数のtoString()結果を取得する。アスペクトが掛かっているかどうかの判定で使用する。
	 */
	var ASPECT_FUNCTION_STR = '';
	var dummyAspect = {
		target: 'h5.devtool.dummyController',
		pointCut: 'f',
		interceptors: DUMMY_NO_VISIBLE_FUNCTION
	};
	compileAspects(dummyAspect);
	h5.settings.aspects = [dummyAspect];
	h5.core.controller(document, {
		__name: 'h5.devtool.dummyController',
		f: function() {
		// この関数にアスペクトを掛けた時のtoString()結果を利用する
		}
	}).initPromise.done(function() {
		ASPECT_FUNCTION_STR = this.f.toString();
		this.dispose();
	});
	h5.settings.aspects = null;

	/**
	 * jQueryを使って別ウィンドウのスタイルを取得できるかどうか
	 * <p>
	 * (IEでjQuery2.0.Xなら取得できない。jQuery2系の場合は自分で計算するようにする)
	 * </p>
	 */
	var useJQueryMeasuringFunctions = !$().jquery.match(/^2.*/);

	/**
	 * devtoolで表示しているコントローラまたはロジックのマップ。idからコントローラまたはロジックを特定できる
	 */
	var targetMap = {};

	// =============================
	// Functions
	// =============================
	/**
	 * h5.scopedglobals.jsからコピペ
	 *
	 * @private
	 * @param value 値
	 * @returns 配列化された値、ただし引数がnullまたはundefinedの場合はそのまま
	 */
	function wrapInArray(value) {
		if (value == null) {
			return value;
		}
		return $.isArray(value) ? value : [value];
	}
	/**
	 * h5.core.__compileAspectsからコピペ
	 *
	 * @param {Object|Object[]} aspects アスペクト設定
	 */
	function compileAspects(aspects) {
		var compile = function(asp) {
			if (asp.target) {
				asp.compiledTarget = getRegex(asp.target);
			}
			if (asp.pointCut) {
				asp.compiledPointCut = getRegex(asp.pointCut);
			}
			return asp;
		};
		h5.settings.aspects = $.map(wrapInArray(aspects), function(n) {
			return compile(n);
		});
	}
	/**
	 * h5scopedglobals.jsからコピペ
	 *
	 * @private
	 * @param {String} str 文字列
	 * @returns {String} エスケープ済文字列
	 */
	function escapeRegex(str) {
		return str.replace(/\W/g, '\\$&');
	}
	/**
	 * h5scopedglobals.jsからコピペ
	 *
	 * @private
	 * @param {String|RegExp} target 値
	 * @returns {RegExp} オブジェクト
	 */
	function getRegex(target) {
		if ($.type(target) === 'regexp') {
			return target;
		}
		var str = '';
		if (target.indexOf('*') !== -1) {
			var array = $.map(target.split('*'), function(n) {
				return escapeRegex(n);
			});
			str = array.join('.*');
		} else {
			str = target;
		}
		return new RegExp('^' + str + '$');
	}

	/**
	 * h5.core.controller.jsからコピペ
	 *
	 * @param {String} selector セレクタ
	 * @returns 特殊オブジェクトの場合は
	 */
	function getGlobalSelectorTarget(selector) {
		var specialObj = ['window', 'document', 'navigator'];
		for (var i = 0, len = specialObj.length; i < len; i++) {
			var s = specialObj[i];
			if (selector === s) {
				// 特殊オブジェクトそのものを指定された場合
				return h5.u.obj.getByPath(selector);
			}
			if (h5.u.str.startsWith(selector, s + '.')) {
				// window. などドット区切りで続いている場合
				return h5.u.obj.getByPath(selector);
			}
		}
		return selector;
	}

	/**
	 * ディベロッパウィンドウを開く
	 *
	 * @returns ディベロッパウィンドウが開くまで待機するpromiseオブジェクト
	 */
	function openDevtoolWindow() {
		var dfd = h5.async.deferred();
		var body = null;
		var w = null;
		if (useWindowOpen) {
			// Firefoxは'about:blank'で開くとDOM追加した後に要素が消されてしまう
			// IE9の場合はnullで開くとDocmodeがquirksになり、'about:blank'で開くとちゃんと9モードになる
			// chromeの場合はどちらでもいい
			// IE9の場合だけ'about:blank'を使うようにしている
			// IE7,8の場合は、about:blankでもnullや空文字でも、Docmodeがquirksになる
			// そのため、IE7,8はDocmode指定済みの空のhtmlを開く
			var url = null;
			if (h5.env.ua.isIE) {
				if (h5.env.ua.browserVersion >= 9) {
					url = 'about:blank';
				} else {
					if (!window.__h5_devtool_page) {
						// IE8-なのにdocmode指定指定済みhtmlファイルの指定がない場合はエラー
						fwLogger
								.error('IE8以下で使用する場合、window.__h5_devtool_pageにダミーページのパスを指定する必要があります。');
						return dfd.reject('no_dummy_page').promise();
					}
					url = window.__h5_devtool_page;
				}
			}
			w = window.open(url, '1',
					'resizable=1, menubar=no, width=910, height=700, toolbar=no, scrollbars=yes');
			if (!w) {
				// ポップアップがブロックされた場合
				return dfd.reject('block').promise();
			}
			if (w._h5devtool) {
				// 既に開いているものがあったら、それを閉じて別のものを開く
				w.close();
				return openDevtoolWindow();
			}
			try {
				// IEで、すでにディベロッパウィンドウが開かれているとき、そのディベロッパウィンドウのプロパティ_h5devtoolはundefinedになっている。
				// そのため、ディベロッパウィンドウが開かれているかどうかはdocumentオブジェクトにアクセスしたときにエラーが出るかで確認する
				// (戻り値を使用していないのでClosureCompileで警告が出ますが、問題ありません。)
				w.document;
			} catch (e) {
				w.close();
				return openDevtoolWindow();
			}

			function setupWindow() {
				w._h5devtool = true;

				body = w.document.body;
				$(body).addClass('h5devtool');
				$(w.document.getElementsByTagName('html')).addClass('h5devtoolHTML');

				// タイトルの設定
				w.document.title = h5.u.str.format('[devtool]{0} - hifive Developer Tool ver.{1}',
						window.document.title, H5_DEV_TOOL_VERSION);
			}


			// IE11の場合、非同期でウィンドウが開くことがある
			// openしたwindowの状態はスクリプトの実行中に変化することがある
			// (= else節を抜けた瞬間にcompleteになることもあり得る)
			// ので、イベントハンドラではなくsetIntervalで設定する
			if (w.document && w.document.readyState === 'complete') {
				setupWindow();
				dfd.resolve(w);
			} else {
				var timer = null;
				timer = setInterval(function() {
					if (w.document && w.document.readyState === 'complete') {
						clearInterval(timer);
						setupWindow();
						dfd.resolve(w);
					}
				}, 100);
			}
		} else {
			// モバイル用の擬似ウィンドウを開く
			w = window;
			body = document.body;
			view.append(body, 'wrapper');
			dfd.resolve(w);
		}
		return dfd.promise();
	}

	// --------------- CSSの設定 ---------------
	/**
	 * キャメルケースからハイフン区切りに変換する
	 *
	 * @param {String} str
	 * @returns 引数をハイフン区切りにした文字列
	 */
	function hyphenate(str) {
		return str.replace(/[A-Z]/g, function(s) {
			return '-' + s.toLowerCase();
		});
	}
	function setCSS(devWindow, styleDef, specialUAStyleDef) {
		// ウィンドウが開きっぱなしの時はスタイル追加はしない
		var doc = devWindow.document;
		if ($(doc).find('style.h5devtool-style').length && devWindow != window) {
			return;
		}
		var cssArray = styleDef;
		if (specialUAStyleDef) {
			for ( var p in specialUAStyleDef) {
				if (h5.env.ua[p]) {
					cssArray = cssArray.concat(specialUAStyleDef[p]);
				}
			}
		}
		var style = doc.createElement('style');
		$(style).addClass('h5devtool-style');
		doc.getElementsByTagName('head')[0].appendChild(style);
		var sheet = doc.styleSheets[doc.styleSheets.length - 1];
		if (sheet.insertRule) {
			for (var i = 0, l = cssArray.length; i < l; i++) {
				var def = cssArray[i];
				var selector = def.selector;
				var rule = def.rule;
				var cssStr = selector + '{';
				for ( var p in rule) {
					var key = hyphenate(p);
					var val = rule[p];
					if ($.isArray(val)) {
						// マルチブラウザ対応で、同じキーに配列で値が設定されていた場合は全てcssStrに含める
						for (var j = 0, len = val.length; j < len; j++) {
							cssStr += key + ':' + val[j] + ';';
						}
					} else {
						cssStr += key + ':' + val + ';';
					}
				}
				cssStr += '}';
				sheet.insertRule(cssStr, sheet.cssRules.length);
			}
		} else {
			// カンマを含むセレクタがaddRuleで使用できるかどうか
			// (IE7-ならaddRuleでカンマを含むセレクタは使用できない)
			var isSupportCommmaSelector = !h5.env.ua.isIE || h5.env.ua.browserVersion > 7;
			for (var i = 0, l = cssArray.length; i < l; i++) {
				var def = cssArray[i];
				var selector = def.selector;
				var rule = def.rule;
				for ( var p in rule) {
					var key = hyphenate(p);
					var val = rule[p];
					if (isSupportCommmaSelector) {
						sheet.addRule(selector, key + ':' + val);
					} else {
						var selectors = selector.split(',');
						for (var j = 0, len = selectors.length; j < len; j++) {
							if ($.isArray(val)) {
								// マルチブラウザ対応で、同じキーに配列で値が設定されていた場合は全てaddRuleする
								for (var k = 0, len = val.length; k < len; k++) {
									sheet.addRule(selectors[j], key + ':' + val[k]);
								}
							} else {
								sheet.addRule(selectors[j], key + ':' + val);
							}
						}
					}
				}
			}
		}
	}
	/**
	 * 関数を文字列化
	 */
	function funcToStr(f) {
		if (!f) {
			return '' + f;
		}
		if (f === DUMMY_NO_VISIBLE_FUNCTION) {
			// ダミーの関数なら表示できません
			return '関数の中身を表示できません';
		}
		var str = f.toString();
		// タブが余分にあった場合は取り除く
		// フォーマットされている前提で、末尾の"}"の前にあるタブの数分を他の行からも取り除く
		var match = str.match(/(\t+)\}$/);
		var tabs = match && match[1];
		if (tabs) {
			return str.replace(new RegExp('\n' + tabs, 'g'), '\n');
		}
		return str;
	}

	/**
	 * DOM要素を"div#id.cls1.cls2"の形式の文字列に変換
	 */
	function formatDOM(elm) {
		if (elm === window) {
			return 'window';
		} else if (elm.nodeType === 9) {
			return 'document';
		}
		var tagName = elm.tagName;
		var id = elm.id;
		var cls = elm.className;
		return tagName.toLowerCase() + (id && '#' + id) + (cls && '.' + cls.replace(/\s/g, '.'));
	}

	/**
	 * コントローラが持つ子コントローラの定義されたプロパティキーのリストを返す
	 *
	 * @param {Controller} controller
	 * @returns {String[]} コントローラが持つ子コントローラの定義されたプロパティキーのリスト
	 */
	function getChildControllerProperties(controller) {
		var ret = [];
		for ( var prop in controller) {
			var target = controller[prop];
			if (h5.u.str.endsWith(prop, 'Controller') && prop !== 'rootController'
					&& prop !== 'parentController' && !$.isFunction(target)
					&& (target && !target.__controllerContext.isRoot)) {
				ret.push(prop);
			}
		}
		return ret;
	}

	/**
	 * イベントハンドラを指定しているキーから対象になる要素を取得
	 *
	 * @param {String} key
	 * @param {Controller} controller
	 * @returns {jQuery} イベントハンドラの対象になる要素
	 */
	function getTargetFromEventHandlerKey(key, controller) {
		var $rootElement = $(controller.rootElement);
		var lastIndex = key.lastIndexOf(' ');
		var selector = $.trim(key.substring(0, lastIndex));
		var isGlobalSelector = !!selector.match(/^\{.*\}$/);
		if (isGlobalSelector) {
			selector = $.trim(selector.substring(1, selector.length - 1));
			if (selector === 'rootElement') {
				return $rootElement;
			}
			return $(getGlobalSelectorTarget(selector));

		}
		return $rootElement.find(selector);
	}

	/**
	 * Dateをフォーマット
	 *
	 * @param {Date} date
	 * @returns {String} フォーマットした日付文字列
	 */
	function timeFormat(date) {
		function formatDigit(val, digit) {
			var d = digit - ("" + val).length;
			for (var i = 0; i < d; i++) {
				val = '0' + val;
			}
			return val;
		}
		var h = formatDigit(date.getHours(), 2);
		var m = formatDigit(date.getMinutes(), 2);
		var s = formatDigit(date.getSeconds(), 2);
		var ms = formatDigit(date.getMilliseconds(), 3);
		return h5.u.str.format('{0}:{1}:{2}.{3}', h, m, s, ms);
	}
	/**
	 * ログメッセージオブジェクトを作成
	 *
	 * @param {Controller|Logic} target
	 * @param message メッセージ}
	 * @param {String} cls クラス。'private'や'event'など
	 * @param {String} tag BEGINやENDなどのタグ
	 * @param {String} promiseState 非同期メソッドの場合の戻り値の状態。'RESOLVED'など
	 * @param {Integer} indentLevel ログのインデント
	 * @returns ログメッセージオブジェクト
	 */
	function createLogObject(target, message, cls, tag, promiseState, indentLevel) {
		return {
			target: target,
			time: timeFormat(new Date()),
			cls: cls,
			message: message,
			tag: tag + ':',
			promiseState: promiseState,
			indentWidth: indentLevel * LOG_INDENT_WIDTH
		};
	}

	/**
	 * 第2引数のログメッセージオブジェクトを第1引数のObservableArrayに追加する。 最大数を超えないようにする
	 *
	 * @param {ObservableArray} logArray
	 * @param {Object} logObj ログオブジェクト
	 */
	function addLogObject(logArray, logObj) {
		// 追加
		logArray.push(logObj);
		// 最大保存件数を超えていたらshift
		if (logArray.length > h5devtoolSettings.get('LogMaxNum')) {
			logArray.shift();
		}
		// dispatchEventでログがアップデートされたことを通知
		// addLogObjectが呼ばれた時だけ更新したいので、カスタムイベントを使って通知している
		logArray.dispatchEvent({
			type: 'logUpdate'
		});
	}

	/**
	 * コントローラ定義オブジェクトを追加する(hifive1.1.8以前用)
	 *
	 * @param {Controller} controller
	 * @param {Object} defObj コントローラ定義オブジェクト
	 */
	function addControllerDef(controller, defObj) {
		if (defObj.__controllerContext) {
			// defObjにコントローラインスタンスが渡されたら、
			// メソッドにアスペクトが掛かっているかどうか判定する
			// 掛かっていたら、『表示できません』にする
			defObj = $.extend(true, {}, defObj);
			for ( var p in defObj) {
				if ($.isFunction(defObj[p]) && defObj[p].toString() === ASPECT_FUNCTION_STR) {
					defObj[p] = DUMMY_NO_VISIBLE_FUNCTION;
				}
			}
		}
		controller.__controllerContext.controllerDef = defObj;
		// 子コントローラを探して再帰的に追加
		for ( var p in defObj) {
			if (h5.u.str.endsWith(p, 'Controller') && p !== 'rootController'
					&& p !== 'parentController' && defObj[p]) {
				addControllerDef(controller[p], defObj[p]);
			}
		}
	}

	/**
	 * ログ用のObservableArrayを作成する
	 *
	 * @returns ログオブジェクトを格納するObservableArray
	 */
	function createLogArray() {
		var ary = h5.core.data.createObservableArray();
		logArrays.push(ary);
		return ary;
	}

	/**
	 * エレメントのスタイルを取得します
	 *
	 * @param {DOM|jQuery} elm
	 * @returns styleオブジェクト
	 */
	function getStyle(elm) {
		return devtoolWindow.getComputedStyle ? devtoolWindow.getComputedStyle($(elm)[0], null)
				: $(elm)[0].currentStyle;
	}

	/**
	 * devtoolWindow内の要素についてouterHeightを計算する
	 *
	 * @param {DOM|jQuery} elm
	 * @returns 引数で渡された要素のouterHeight
	 */
	function getOuterHeight(elm) {
		if (useJQueryMeasuringFunctions) {
			return $(elm).outerHeight();
		}
		var elmStyle = getStyle(elm);
		return parseInt(elmStyle.height) + parseInt(elmStyle.paddingTop)
				+ parseInt(elmStyle.paddingBottom) + parseInt(elmStyle.borderTopWidth)
				+ parseInt(elmStyle.borderBottomWidth) + parseInt(elmStyle.marginTop)
				+ parseInt(elmStyle.marginBottom);
	}

	/**
	 * devtoolWindow内の要素についてouterWidthを計算する
	 *
	 * @param {DOM|jQuery} elm
	 * @returns 引数で渡された要素のouterWidth
	 */
	function getOuterWidth(elm) {
		if (useJQueryMeasuringFunctions) {
			return $(elm).outerWidth();
		}
		var elmStyle = getStyle(elm);
		return parseInt(elmStyle.width) + parseInt(elmStyle.paddingLeft)
				+ parseInt(elmStyle.paddingRight) + parseInt(elmStyle.borderLeftWidth)
				+ parseInt(elmStyle.borderRightWidth) + parseInt(elmStyle.marginLeft)
				+ parseInt(elmStyle.marginRight);
	}

	/**
	 * offsetParentを取得する
	 *
	 * @param {DOM|jQuery} elm
	 * @returns 引数で渡された要素のoffsetParent
	 */
	function getOffsetParent(elm) {
		var offsetParent = $(elm)[0];
		while (offsetParent && offsetParent.nodeName !== 'HTML'
				&& (getStyle(offsetParent)['position'] === 'static')) {
			offsetParent = offsetParent.offsetParent;
		}
		return offsetParent || elm.ownerDocument;
	}

	/**
	 * コントローラまたはロジックがすでにdisposeされているかどうかを判定する
	 *
	 * @param {Controller|Logic} target
	 * @returns {Boolean}
	 */
	function isDisposed(target) {
		// コントローラとロジック共通で見たいので__nameがあるかどうかでチェックしている
		return !target.__name;
	}

	/**
	 * メソッドの実行回数をカウントするクラス。
	 * <p>
	 * (メソッド名をプロパティにしたObservableItemは作成できない(プロパティの命名制限のため)ので、オリジナルのクラスを作成)
	 * </p>
	 *
	 * @param {Controller|Logic} target
	 * @param {Function} callback メソッドが実行されたときに実行するコールバック関数
	 * @returns {ObservableItem}
	 */
	function MethodCount(target, callback) {
		this._method = {};
		this._callback = callback;

		// 定義オブジェクトを取得
		var defObj = target.__controllerContext ? target.__controllerContext.controllerDef
				: target.__logicContext.logicDef;

		for ( var p in defObj) {
			if ($.isFunction(defObj[p])) {
				this._method[p] = {
					count: 0
				};
			}
		}
	}
	$.extend(MethodCount.prototype, {
		count: function(method) {
			var val = ++this._method[method].count;
			if (this._callback) {
				this._callback(method);
			}
			return val;
		},
		get: function(method) {
			return this._method[method].count;
		},
		registerCallback: function(f) {
			this._callback = f;
		},
		removeCallback: function() {
			this._callback = null;
		}
	});

	/**
	 * コントローラまたはロジックからdevtoolコンテキストを取得する。 ない場合はからオブジェクトを作成する
	 *
	 * @param {Controller|Logic} target コントローラまたはロジック
	 * @returns devtoolコンテキスト
	 */
	function getDevtoolContext(target) {
		if (!target) {
			return null;
		}
		var targetContext = target.__controllerContext || target.__logicContext;
		targetContext.devtool = targetContext.devtool || {};
		return targetContext.devtool;
	}

	/**
	 * 要素を点滅させる
	 *
	 * @param {DOM|jQuery} elm
	 */
	function blinkElm(elm) {
		var $elm = $(elm);
		function _blink(count) {
			$elm.addClass('blink');
			setTimeout(function() {
				$elm.removeClass('blink');
				if (!count) {
					return;
				}
				setTimeout(function() {
					_blink(--count);
				}, 100);
			}, 100);
		}
		_blink(4);
	}

	/**
	 * コントローラまたはターゲットを登録する
	 *
	 * @param {Controller|Logic} target
	 */
	function registerDevtoolTarget(target) {
		var id = target.__name + '_' + new Date().getTime() + '_' + parseInt(Math.random() * 1000);
		targetMap[id] = target;
		getDevtoolContext(target).id = id;
	}

	/**
	 * 登録されたコントローラまたはロジックを取得する
	 *
	 * @param {String} id
	 * @returns {Controller|Logic}
	 */
	function getDevtoolTarget(id) {
		return targetMap[id];
	}

	/**
	 * コントローラまたはターゲットの登録を削除する
	 *
	 * @param {Controller|Logic} target
	 */
	function removeDevtoolTarget(id) {
		delete targetMap[id];
	}

	/**
	 * イベントリスナをバインド
	 *
	 * @param {Object} target addEventlisterたはatacheEvent
	 * @param {String} event イベント名
	 * @param {Function} listener イベントリスナ
	 */
	function bindListener(target, event, listener) {
		if (target.addEventListener) {
			target.addEventListener(event, listener);
		} else {
			target.attachEvent('on' + event, listener);
		}
	}

	/**
	 * 第1引数で指定されたメソッドリスト要素を、第2引数のメソッド名を持つliまでスクロールする。 第3引数で点滅させるかどうか指定する。
	 *
	 * @param {jQuery} $methodList
	 * @param {string} method
	 * @param {boolean} isBlink
	 */
	function scrollByMethodName($methodList, method, isBlink) {
		var scrollVal = 0;
		var li = null;
		$methodList.find('li').each(function() {
			if ($.trim($(this).find('.name').text()) === method) {
				scrollVal = this.offsetTop - this.parentNode.offsetTop;
				li = this;
				return false;
			}
		});
		if (li) {
			$methodList.scrollTop(scrollVal);
			blinkElm(li);
		}
	}
	// =========================================================================
	//
	// Controller
	//
	// =========================================================================

	/**
	 * コンテキストメニューコントローラ
	 */
	var contextMenuController = {

		/**
		 * @memberOf h5.devtool.ui.ContextMenuController
		 */
		__name: 'h5.devtool.ui.ContextMenuController',

		_contextMenu: null,

		contextMenuExp: '',

		targetAll: true,

		__construct: function(context) {
			if (context.args) {
				var targetAll = context.args.targetAll;
				if (targetAll != undefined) {
					this.targetAll = context.args.targetAll;
				}
				var contextMenuExp = context.args.contextMenuExp;
				if (contextMenuExp != undefined) {
					this.contextMenuExp = context.args.contextMenuExp;
				}
			}
		},

		__ready: function(context) {
			var root = $(this.rootElement);
			var targetAll = root.attr('data-targetall');
			if (targetAll != undefined) {
				if (/false/i.test(targetAll)) {
					targetAll = false;
				}
				this.targetAll = !!targetAll;
			}
			var contextMenuExp = root.attr('data-contextmenuexp');
			if (contextMenuExp != undefined) {
				this.contextMenuExp = context.args.contextMenuExp;
			}
			this.close();
		},

		_getContextMenu: function(exp) {
			return this.$find('> .contextMenu' + (exp || this.contextMenuExp));
		},

		close: function(selected) {
			var $contextMenu = this.$find('> .contextMenu');

			if (!$contextMenu.hasClass('open')) {
				// 既に閉じているなら何もしない(イベントもあげない)
				return;
			}
			// selectMenuItemイベントを上げる
			// 選択されたアイテムがあれば、それを引数に入れる
			// そもそもopenしていなかったらイベントは上げない
			this.trigger('selectMenuItem', {
				selected: selected ? selected : null
			});

			$contextMenu.css({
				display: 'none'
			});
			$contextMenu.removeClass('open');
			// イベントを上げる
			this.trigger('hideCustomMenu');
		},

		_open: function(context, exp) {
			var $contextMenu = this._getContextMenu(exp);

			// イベントを上げる
			// 既にopenしていたらイベントは上げない
			if (!$contextMenu.hasClass('open')) {
				var e = this.trigger('showCustomMenu', {
					orgContext: context
				});
				if (e.isDefaultPrevented()) {
					// preventDefaultされていたらメニューを出さない
					return;
				}
			}

			$contextMenu.css({
				display: 'block',
				visibility: 'hidden',
				left: 0,
				top: 0
			});
			// contextMenu要素のスタイルの取得、offsetParentの取得はjQueryを使わないようにしている
			// jQuery2.0.Xで、windowに属していない、別ウィンドウ内の要素についてwindow.getComputedStyle(elm)をしており、
			// IEだとそれが原因でエラーになるため。
			$contextMenu.addClass('open');
			var pageX, pageY;
			if (context.event.originalEvent.targetTouches) {
				// タッチイベントの場合
				var touch = context.event.originalEvent.targetTouches[0];
				pageX = touch.pageX;
				pageY = touch.pageY;
			} else {
				pageX = context.event.pageX;
				pageY = context.event.pageY;
			}
			var offsetParent = getOffsetParent($contextMenu);
			var offsetParentOffset = $(offsetParent).offset();
			var left = pageX - offsetParentOffset.left;
			var top = pageY - offsetParentOffset.top;
			var outerWidth = getOuterWidth($contextMenu);
			var outerHeight = getOuterHeight($contextMenu);
			var scrollLeft = scrollPosition('Left')();
			var scrollTop = scrollPosition('Top')();
			var windowWidth = getDisplayArea('Width');
			var windowHeight = getDisplayArea('Height');
			var windowRight = scrollLeft + windowWidth;
			var windowBottom = scrollTop + windowHeight;
			var right = left + outerWidth;
			if (right > windowRight) {
				left = windowRight - outerWidth;
				if (left < scrollLeft)
					left = scrollLeft;
			}
			var bottom = top + outerHeight;
			if (bottom > windowBottom) {
				top = top - outerHeight;
				if (top < scrollTop)
					top = scrollTop;
			}

			initSubMenu($contextMenu, right, top);

			$contextMenu.css({
				visibility: 'visible',
				left: left,
				top: top
			});

			function initSubMenu(menu, _right, _top) {
				menu.find('> .dropdown-submenu > .dropdown-menu').each(function() {
					var subMenu = $(this);
					var nextRight;
					var display = subMenu[0].style.display;
					subMenu.css({
						display: 'block'
					});
					var subMenuWidth = subMenu.outerWidth(true);
					if (subMenuWidth > windowRight - _right) {
						subMenu.parent().addClass('pull-left');
						nextRight = _right - subMenuWidth;
					} else {
						subMenu.parent().removeClass('pull-left');
						nextRight = _right + subMenuWidth;
					}

					var parent = subMenu.parent();
					var subMenuTop = _top + parent.position().top;
					var subMenuHeight = subMenu.outerHeight(true);
					if (subMenuHeight > windowBottom - subMenuTop) {
						subMenuTop = subMenuTop - subMenuHeight + parent.height();
						subMenu.css({
							top: 'auto',
							bottom: '0'
						});
					} else {
						subMenu.css({
							top: '0',
							bottom: 'auto'
						});
					}

					initSubMenu(subMenu, nextRight, subMenuTop);

					subMenu.css({
						display: display
					});
				});
			}

			//hifiveから流用(13470)
			function getDisplayArea(prop) {
				var compatMode = (document.compatMode !== 'CSS1Compat');
				var e = compatMode ? document.body : document.documentElement;
				return h5.env.ua.isiOS ? window['inner' + prop] : e['client' + prop];
			}

			//hifiveから流用(13455)
			function scrollPosition(propName) {
				var compatMode = (document.compatMode !== 'CSS1Compat');
				var prop = propName;

				return function() {
					// doctypeが「XHTML1.0 Transitional DTD」だと、document.documentElement.scrollTopが0を返すので、互換モードを判定する
					// http://mokumoku.mydns.jp/dok/88.html
					var elem = compatMode ? document.body : document.documentElement;
					var offsetProp = (prop === 'Top') ? 'Y' : 'X';
					return window['page' + offsetProp + 'Offset'] || elem['scroll' + prop];
				};
			}
		},

		/**
		 * コンテキストメニューを出す前に実行するフィルタ。 falseを返したらコンテキストメニューを出さない。
		 * 関数が指定された場合はその関数の実行結果、セレクタが指定された場合は右クリック時のセレクタとマッチするかどうかを返す。
		 */
		_filter: null,

		/**
		 * コンテキストメニューを出すかどうかを判定するフィルタを設定する。 引数には関数またはセレクタを指定できる。
		 * 指定する関数はcontextを引数に取り、falseを返したらコンテキストメニューを出さないような関数を指定する。
		 * セレクタを指定した場合は、右クリック時のevent.targetがセレクタにマッチする場合にコンテキストメニューを出さない。
		 *
		 * @memberOf ___anonymous46_5456
		 * @param selectorOrFunc
		 */
		setFilter: function(selectorOrFunc) {
			if (selectorOrFunc == null) {
				this._filter = null;
			} else if ($.isFunction(selectorOrFunc)) {
				// 渡された関数をthis._filterにセット
				this._filter = selectorOrFunc;
			} else if (typeof (selectorOrFunc) === 'string') {
				this._filter = function(context) {
					// targetがセレクタとマッチしたらreturn false;
					if ($(context.event.target).filter(selectorOrFunc).length) {
						return false;
					}
				};
			}
		},

		'.trace-list>li>* touchstart': function(context) {
			this._contextmenu(context);
		},

		'{rootElement} contextmenu': function(context) {
			this._contextmenu(context);
		},

		'{document.body} click': function(context) {
			this.close();
		},

		'{document.body} contextmenu': function(context) {
			this.close();
		},

		'.contextMenuBtn contextmenu': function(context) {
			context.event.preventDefault();
			context.event.stopPropagation();
			var current = context.event.currentTarget;
			var exp = $(current).attr('data-contextmenuexp');
			this._open(context, exp);
		},

		'> .contextMenu .dropdown-menu click': function(context) {
			context.event.stopPropagation();
			this.close();
		},
		//
		//		'> .contextMenu .dropdown-submenu click': function(context) {
		//			context.event.stopPropagation();
		//		},
		//
		//		'> .contextMenu contextmenu': function(context) {
		//			context.event.stopPropagation();
		//		},
		//
		//		'> .contextMenu click': function(context) {
		//			context.event.stopPropagation();
		//		},

		'> .contextMenu li a click': function(context) {
			context.event.stopPropagation();
			this.close(context.event.target);
		},

		_contextmenu: function(context) {
			this.close();
			// _filterがfalseを返したら何もしない
			if (this._filter && this._filter(context) === false) {
				return;
			}
			if (this.targetAll) {
				context.event.preventDefault();
				context.event.stopPropagation();
				this._open(context);
			}
		}
	};
	h5.core.expose(contextMenuController);

	/**
	 * ControllerInfoController
	 * <p>
	 * コントローラ及びコントローラが持つロジックの情報を表示するコントローラ
	 * </p>
	 *
	 * @name h5.devtool.ControllerInfoController
	 */
	var controllerInfoController = {
		/**
		 * @name h5.devtool.ControllerInfoController
		 */
		__name: 'h5.devtool.ControllerInfoController',
		/**
		 * @name h5.devtool.ControllerInfoController
		 */
		win: null,
		/**
		 * @name h5.devtool.ControllerInfoController
		 */
		$info: null,
		/**
		 * 選択中のコントローラまたはロジック
		 *
		 * @name h5.devtool.ControllerInfoController
		 */
		selectedTarget: null,

		/**
		 * コントローラまたはロジックのメソッド名と、実行回数表示DOMのマップ
		 *
		 * @name h5.devtool.ControllerInfoController
		 */
		_methodCountMap: {},

		__init: function() {
			// 既存のコントローラにコントローラ定義オブジェクトを持たせる(hifive1.1.8以前用)
			// このコントローラがコントローラ定義オブジェクトを持ってるかどうかでhifiveのバージョン判定
			if (!this.__controllerContext.controllerDef) {
				// コントローラを取得(__initの時点なので、このコントローラは含まれていない)。
				var controllers = h5.core.controllerManager.getAllControllers();
				for (var i = 0, l = controllers.length; i < l; i++) {
					addControllerDef(controllers[i], controllers[i]);
				}
			}
		},
		/**
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param context
		 */
		__ready: function(context) {

			// 初期化処理
			this.win = context.args.win;
			setCSS(this.win, h5.env.ua.isDesktop ? H5DEVTOOL_STYLE : H5DEVTOOL_STYLE
					.concat(MOBILE_STYLE), SPECIAL_UA_H5DEVTOOL_STYLE);
			setCSS(window, H5PAGE_STYLE);
			// コントローラの詳細表示エリア
			view.append(this.$find('.left'), 'target-list');
			this.$find('.right>.detail').css('display', 'none');

			// この時点ですでにバインドされているコントローラがあった場合、h5controllerboundイベントで拾えないので
			// コントローラリストの更新を行う
			// TODO すでにバインド済みのコントローラに対してはアスペクトを掛けられないので、ログが出ない。
			// コントローラ化済みのものに対してログを出すようにする機構が必要。
			// h5controllerboundが上がってくるのは__initの後、__readyの前なので、__initはその前に書き換える必要がある
			var controllers = h5.core.controllerManager.getAllControllers();
			for (var i = 0, l = controllers.length; i < l; i++) {
				this._h5controllerbound(controllers[i]);
			}
		},
		/**
		 * クローズ時のイベント
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 */
		'{.h5devtool} close': function() {
			this.removeOverlay(true);
		},
		/**
		 * 左側の何もない箇所がクリックされたらコントローラの選択なしにする
		 */
		'{.h5devtool} leftclick': function() {
			this.unfocus();
		},

		/**
		 * コントローラが新たにバインドされた
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param context
		 */
		'{document} h5controllerbound': function(context) {
			var target = context.evArg;
			// すでにdispose済みだったら何もしない
			if (isDisposed(target)) {
				return;
			}
			this._h5controllerbound(context.evArg);
		},

		/**
		 * openerがあればそっちのdocumentにバインドする
		 */
		'{window.opener.document} h5controllerbound': function(context) {
			this._h5controllerbound(context.evArg);
		},
		_h5controllerbound: function(controller) {
			this.appendTargetToList(controller);
		},

		/**
		 * コントローラがアンバインドされた
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param context
		 */
		'{document} h5controllerunbound': function(context) {
			this._h5controllerunbound(context.evArg);
		},
		/**
		 * openerがあればそっちのdocumentにバインドする
		 */
		'{window.opener.document} h5controllerunbound': function(context) {
			this._h5controllerunbound(context.evArg);
		},
		_h5controllerunbound: function(controller) {
			var $selected = this.$find('.selected');
			if (controller === this.getTargetFromElem($selected)) {
				this.unfocus();
			}
			this.removeControllerList(controller);
			removeDevtoolTarget(getDevtoolContext(controller).id);
		},
		/**
		 * マウスオーバーでコントローラのバインド先オーバレイ表示(PC用)
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param context
		 * @param $el
		 */
		'.targetlist .target-name mouseover': function(context, $el) {
			if (hasTouchEvent) {
				return;
			}
			var target = this.getTargetFromElem($el);
			this.removeOverlay();
			if (!isDisposed(target) && target.__controllerContext) {
				// disposeされていないコントローラならオーバレイを表示
				$el.data('h5devtool-overlay', this.overlay(target.rootElement,
						target.__controllerContext.isRoot ? 'root' : 'child'));
			}
		},
		/**
		 * マウスアウト
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param context
		 * @param $el
		 */
		'.targetlist .target-name mouseout': function(context, $el) {
			if (hasTouchEvent) {
				return;
			}
			this.removeOverlay();
		},

		/**
		 * コントローラリスト上のコントローラをクリック
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param context
		 * @param $el
		 */
		'.targetlist .target-name click': function(context, $el) {
			if ($el.hasClass('selected')) {
				// 既に選択済み
				return;
			}
			var target = this.getTargetFromElem($el);

			this.$find('.target-name').removeClass('selected');
			$el.addClass('selected');
			this.setTarget(target);
			// ターゲットリストと紐づいているオーバレイ要素を取得
			var $overlay = $el.data('h5devtool-overlay');
			if ($overlay) {
				this.removeOverlay(true, $overlay);
				// ボーダーだけのオーバレイに変更
				$('.h5devtool-overlay').addClass('borderOnly');
			}
		},

		setTarget: function(target) {
			this.selectedTarget = target;
			this.setDetail(target);
		},

		/**
		 * イベントハンドラにマウスオーバーで選択(PC用)
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 */
		' .eventHandler li:not(.selected) mouseover': function(context, $el) {
			this.selectEventHandler($el);
		},
		/**
		 * イベントハンドラをクリックで選択(タブレット用)
		 *
		 * @memberOf h5.devtool.DevtoolController
		 */
		'.eventHandler li:not(.selected) click': function(context, $el) {
			this.selectEventHandler($el);
		},
		/**
		 * イベントハンドラからカーソルを外した時(PC用)
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 */
		' .eventHandler li.selected mouseleave': function(context, $el) {
			this.selectEventHandler(null);
		},

		/**
		 * イベントハンドラの選択
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param $el
		 */
		selectEventHandler: function($el) {
			this.$find('.eventHandler li').removeClass('selected');
			this.removeOverlay();
			if ($el == null) {
				return;
			}
			$el.addClass('selected');
			var controller = this.getTargetFromElem(this.$find('.target-name.selected'));
			var key = $.trim($el.find('.name').text());
			var $target = getTargetFromEventHandlerKey(key, controller);

			// 取得結果を保存。これはクリックしてイベントを発火させるとき用です。
			// 再度mosueoverされ場合は新しく取得しなおします。
			$el.data('h5devtool-eventTarget', $target);
			this.overlay($target, 'event-target');

			// 実行メニューの表示
			var $select = $el.closest('li').find('select.eventTarget').html('');
			if (!$target.length) {
				var $option = $(devtoolWindow.document.createElement('option'));
				$option.text('該当なし');
				$select.append($option);
				$select.attr('disabled', 'disabled');
			} else {
				$target.each(function() {
					var $option = $(devtoolWindow.document.createElement('option'));
					$option.data('h5devtool-eventTarget', this);
					$option.text(formatDOM(this));
					$select.append($option);
				});
			}
		},

		/**
		 * イベントを実行
		 */
		' .eventHandler .trigger click': function(context, $el) {
			var evName = $.trim($el.closest('li').find('.name').text()).match(/ (\S+)$/)[1];
			var target = $el.closest('.menu').find('option:selected').data('h5devtool-eventTarget');
			if (target) {
				// TODO evNameがmouse/keyboard/touch系ならネイティブのイベントでやる
				$(target).trigger(evName);
			} else {
				alert('イベントターゲットがありません');
			}
		},

		/**
		 * メソッドにジャンプ
		 */
		'.method-select change': function(context, $el) {
			var method = $el.val();
			var $methodList = $el.parents('.active').eq(0).find('.method-list');
			scrollByMethodName($methodList, method, true);
		},

		/**
		 * タブの切り替え
		 */
		'{.h5devtool} tabChange': function(context) {
			var target = context.evArg;
			if (target !== 'eventHandler') {
				// イベントハンドラの選択状態を解除
				this.removeOverlay();
				this.$find('.eventHandler li').removeClass('selected');
			}
		},
		/**
		 * 詳細画面をクリア(要素の削除とコントローラのdispose)
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param target
		 */
		_clearDetailView: function() {
			// 詳細ビューに表示されているコントローラを取得
			var controllers = h5.core.controllerManager.getControllers(this.$find('.right'), {
				deep: true
			});
			// 元々詳細ビューにバインドされていたコントローラをアンバインド
			for (var i = 0, l = controllers.length; i < l; i++) {
				controllers[i].dispose();
			}
			this.$find('.right').html('');
		},

		/**
		 * 詳細画面(右側画面)をコントローラまたはロジックを基に作成。nullが渡されたら空白にする
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param target
		 */
		setDetail: function(target) {
			this._clearDetailView();
			if (target == null) {
				return;
			}

			// methodCountオブジェクトを持たせる
			var devtoolContext = getDevtoolContext(target);
			if (!devtoolContext.methodCount._method) {
				devtoolContext.methodCount._method = new MethodCount(target);
			}

			// コントローラの場合はコントローラの詳細ビューを表示
			if (target.__controllerContext) {
				this._showControllerDetail(target);
			} else {
				// ロジックの場合はロジックの詳細ビューを表示
				this._showLogicDetail(target);
			}
		},
		/**
		 * コントローラの詳細表示
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param controller
		 */
		_showControllerDetail: function(controller) {
			view.update(this.$find('.right'), 'controller-detail');

			// メソッド(イベントハンドラ以外)とイベントハンドラを列挙
			var methods = [];
			var eventHandlers = [];
			var devtoolContext = getDevtoolContext(controller);
			for ( var p in devtoolContext.methodCount._method) {
				if (p.indexOf(' ') === -1) {
					methods.push(p);
				} else {
					eventHandlers.push(p);
				}
			}

			methods.sort(function(a, b) {
				// lifecycle, public, privateの順でソート
				// lifecycleはライフサイクルの実行順、public、privateは辞書順
				if ($.inArray(a, LIFECYCLE_METHODS) !== -1
						&& $.inArray(b, LIFECYCLE_METHODS) !== -1) {
					// 両方ともライフサイクルメソッド
					return $.inArray(a, LIFECYCLE_METHODS) - $.inArray(b, LIFECYCLE_METHODS);
				}
				// lifecycle, public, privateの順でソート
				var ret = 0;
				ret -= $.inArray(a, LIFECYCLE_METHODS) >= 0 ? 1 : 0;
				ret += $.inArray(b, LIFECYCLE_METHODS) >= 0 ? 1 : 0;
				ret -= h5.u.str.startsWith(a, '_') && $.inArray(a, LIFECYCLE_METHODS) === -1 ? -1
						: 0;
				ret += h5.u.str.startsWith(b, '_') && $.inArray(b, LIFECYCLE_METHODS) === -1 ? -1
						: 0;
				return ret === 0 ? (a > b ? 1 : -1) : ret;
			});

			this._updateEventHandlerView({
				id: devtoolContext.id,
				controller: controller.__controllerContext.controllerDef,
				eventHandlers: eventHandlers,
				_funcToStr: funcToStr,
				methodCount: devtoolContext.methodCount
			});

			this._updateMethodView({
				id: devtoolContext.id,
				defObj: controller.__controllerContext.controllerDef,
				methods: methods,
				_funcToStr: funcToStr,
				methodCount: devtoolContext.methodCount
			});

			// ログ
			var logAry = devtoolContext.devtoolLog;
			h5.core.controller(this.$find('.instance-detail .trace'), traceLogController, {
				traceLogs: logAry,
				// トレースログと違ってログのコントローラからControllerInfoControllerが辿れなくなるため
				// 引数で渡してログコントローラに覚えさせておく
				_parentControllerCtrlInfoCtrl: this
			});

			// その他情報
			var childControllerProperties = getChildControllerProperties(controller);
			var childControllerNames = [];
			for (var i = 0, l = childControllerProperties.length; i < l; i++) {
				childControllerNames.push(controller[childControllerProperties[i]].__name);
			}
			// このコントローラビューに登録されているテンプレートの列挙
			var registedTemplates = [];
			for ( var p in controller.view.__view.__cachedTemplates) {
				if ($.inArray(p, registedTemplates) === -1) {
					registedTemplates.push(p);
				}
			}
			// コントローラで有効なすべてのテンプレート
			var availableTemplates = [];
			var ctrl = controller;
			var v = ctrl.view.__view;
			while (true) {
				var templates = v.__cachedTemplates;
				for ( var p in templates) {
					if ($.inArray(p, availableTemplates) === -1) {
						availableTemplates.push(p);
					}
				}
				if (v === h5.core.view) {
					break;
				}
				if (ctrl.parentController) {
					ctrl = ctrl.parentController;
					v = ctrl.view.__view;
				} else {
					v = h5.core.view;
				}
			}

			view.update(this.$find('.instance-detail .tab-content .otherInfo'),
					'controller-otherInfo', {
						controller: controller,
						childControllerNames: childControllerNames,
						_formatDOM: formatDOM,
						availableTemplates: availableTemplates,
						registedTemplates: registedTemplates
					});
		},
		_updateEventHandlerView: function(obj) {
			var $target = this.$find('.instance-detail .tab-content .eventHandler');
			// viewの更新
			view.update($target, 'eventHandler-list', obj);
			// セレクトボックスを追加
			var $select = $target.find('.method-select');
			for (var i = 0, l = obj.eventHandlers.length; i < l; i++) {
				$select.append(h5.u.str.format('<option value="{0}">{0}</option>',
						obj.eventHandlers[i]));
			}

			// メソッドの実行回数に対応するDOMをマップで持っておく
			var methodCountMap = this._methodCountMap;
			var targetId = obj.id;
			$target.find('.method-list>*').each(function() {
				var $this = $(this);
				methodCountMap[targetId + '#' + $this.find('.name').text()] = $this.find('.count');
			});
			this._registerMethodCountCallback(getDevtoolTarget(obj.id), obj.methodCount);
		},

		_updateMethodView: function(obj) {
			var $target = this.$find('.instance-detail .tab-content .method');
			// viewの更新
			view.update($target, 'method-list', obj);
			// セレクトボックスを追加
			var $select = $target.find('.method-select');
			for (var i = 0, l = obj.methods.length; i < l; i++) {
				$select.append(h5.u.str.format('<option value="{0}">{0}</option>', obj.methods[i]));
			}
			// メソッドの実行回数に対応するDOMをマップで持っておく
			var methodCountMap = this._methodCountMap;
			var targetId = obj.id;
			$target.find('.method-list>*').each(function() {
				var $this = $(this);
				methodCountMap[targetId + '#' + $this.find('.name').text()] = $this.find('.count');
			});
			this._registerMethodCountCallback(getDevtoolTarget(obj.id), obj.methodCount);
		},
		/**
		 * 表示中のタブが押されたら更新する
		 */
		'.detail>.nav-tabs>.active click': function(context, $el) {
			if ($el.data('tab-page') === 'method' || $el.data('tab-page') === 'eventHandler') {
				var target = this.getTargetFromElem(this.$find('.target-name.selected'));
				this.setDetail(target);
			}
		},

		/**
		 * ロジックの詳細表示
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param logic
		 */
		_showLogicDetail: function(logic) {
			view.update(this.$find('.right'), 'logic-detail');

			// メソッドリスト
			// public, privateの順で辞書順ソート
			var privateMethods = [];
			var publicMethods = [];
			for ( var p in logic.__logicContext.logicDef) {
				if ($.isFunction(logic.__logicContext.logicDef[p])) {
					// メソッド
					// publicかprivateかを判定する
					if (h5.u.str.startsWith(p, '_')) {
						privateMethods.push(p);
					} else {
						publicMethods.push(p);
					}
				}
			}

			// ソート
			privateMethods.sort();
			publicMethods.sort();
			var methods = publicMethods.concat(privateMethods);

			var devtoolContext = getDevtoolContext(logic);
			var $target = this.$find('.instance-detail .tab-content .method');
			this._updateMethodView({
				id: devtoolContext.id,
				defObj: logic.__logicContext.logicDef,
				methods: methods,
				_funcToStr: funcToStr,
				methodCount: devtoolContext.methodCount
			});
			// メソッドが対応するDOMをmethodCountに登録
			var methodCountMap = this._methodCountMap;
			var targetId = devtoolContext.id;
			$target.find('.method-list>*').each(function() {
				var $this = $(this);
				methodCountMap[targetId + '#' + $this.find('.name').text()] = $this.find('.count');
			});
			this._registerMethodCountCallback(logic, devtoolContext.methodCount);

			// ログ
			var logAry = devtoolContext.devtoolLog;
			h5.core.controller(this.$find('.instance-detail .trace'),
					h5.devtool.TraceLogController, {
						traceLogs: logAry,
						// トレースログと違ってログのコントローラからControllerInfoControllerが辿れなくなるため
						// 引数で渡してログコントローラに覚えさせておく
						_parentControllerCtrlInfoCtrl: this
					});

			// その他情報
			view.update(this.$find('.instance-detail .tab-content .otherInfo'), 'logic-otherInfo',
					{
						defObj: logic.__logicContext.logicDef,
						instanceName: devtoolContext.instanceName
					});
		},

		/**
		 * メソッドカウントにメソッドをカウントするコールバックを登録
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param {MethodCount} methodCount
		 */
		_registerMethodCountCallback: function(target, methodCount) {
			methodCount.registerCallback(this.own(function(method) {
				if (isDisposed(target) || this.selectedTarget !== target) {
					// dispose済み、または選択中でない、なら何もしない
					return;
				}
				var targetId = getDevtoolContext(target).id;
				var $target = this._methodCountMap[targetId + '#' + method];
				$target.text(methodCount.get(method));
				$target.parent().addClass('called');
			}));
		},

		/**
		 * エレメントにコントローラまたはロジックのIDを持たせる
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param el
		 * @param target
		 */
		setTargetToElem: function(el, target) {
			$(el).data('h5devtool-targetId', getDevtoolContext(target).id);
		},
		/**
		 * エレメントに覚えさせたコントローラまたはロジックを取得する
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param el
		 * @returns {Controller|Logic}
		 */
		getTargetFromElem: function(el) {
			return getDevtoolTarget($(el).data('h5devtool-targetId'));
		},
		/**
		 * 選択を解除
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 */
		unfocus: function() {
			this.setDetail(null);
			this.$find('.target-name').removeClass('selected');
			this.removeOverlay(true);
		},
		/**
		 * 引数に指定された要素にオーバレイ
		 *
		 * @param elem オーバレイ対象要素
		 * @param classNames オーバレイ要素に追加するクラス名
		 * @returns 追加したオーバレイ要素
		 * @memberOf h5.devtool.ControllerInfoController
		 */
		overlay: function(elem, classNames) {
			var className = ($.isArray(classNames) ? classNames : [classNames]).join(' ');
			var $el = $(elem);
			var $ret = $();
			$el.each(function() {
				var $overlay = $(view.get('overlay', {
					cls: className
				}));

				var width = $(this).outerWidth();
				var height = $(this).outerHeight();
				// documentオブジェクトならoffset取得できないので、0,0にする
				var offset = $(this).offset() || {
					top: 0,
					left: 0
				};

				$overlay.css({
					width: width,
					height: height,
					top: offset.top,
					left: offset.left
				});
				var $borderTop = $overlay.find('.border.top');
				var $borderRight = $overlay.find('.border.right');
				var $borderBottom = $overlay.find('.border.bottom');
				var $borderLeft = $overlay.find('.border.left');

				$borderTop.css({
					top: 0,
					left: 0,
					width: width,
					height: OVERLAY_BORDER_WIDTH
				});
				$borderRight.css({
					top: 0,
					left: width,
					width: OVERLAY_BORDER_WIDTH,
					height: height
				});
				$borderBottom.css({
					top: height,
					left: 0,
					width: width,
					height: OVERLAY_BORDER_WIDTH
				});
				$borderLeft.css({
					top: 0,
					left: 0,
					width: OVERLAY_BORDER_WIDTH,
					height: height
				});

				$(window.document.body).append($overlay);
				$ret = $ret.add($overlay);
			});
			return $ret;
		},
		/**
		 * オーバレイの削除。deleteAllにtrueが指定された場合ボーダーだけのオーバーレイも削除
		 *
		 * @param {Boolean} [deleteAll=false] ボーダーだけのオーバレイも削除するかどうか
		 * @param {jQuery} $exclude 除外するオーバーレイ要素
		 * @memberOf h5.devtool.ControllerInfoController
		 */
		removeOverlay: function(deleteAll, $exclude) {
			var $target = deleteAll ? $('.h5devtool-overlay')
					: $('.h5devtool-overlay:not(.borderOnly)');
			($exclude ? $target.not($exclude) : $target).remove();
		},
		/**
		 * コントローラまたはロジックをコントローラリストに追加
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param target
		 */
		appendTargetToList: function(target, $ul) {
			if (h5.u.str.startsWith(target.__name, 'h5.devtool')) {
				// Devtoolがバインドしているコントローラは無視
				return;
			}
			// devtoolのコンテキストを取得(無ければ新しい空オブジェクトが作成される)
			var devtoolContext = getDevtoolContext(target);
			// ターゲットマップに登録
			registerDevtoolTarget(target);

			$ul = $ul || this.$find('.targetlist:first');
			// ログ用のObservableArrayを持たせる
			if (!devtoolContext.devtoolLog) {
				devtoolContext.devtoolLog = createLogArray();
			}

			// メソッド・イベントハンドラの実行回数を保持するオブジェクトを持たせる
			devtoolContext.methodCount = new MethodCount(target);

			if (target.__controllerContext) {
				// コントローラの場合
				var isRoot = target.__controllerContext.isRoot;
				var $li = $(view.get('target-list-part', {
					name: target.__name,
					cls: isRoot ? 'root' : 'child'
				}), $ul[0].ownerDocument);
				// データにコントローラを持たせる
				this.setTargetToElem($li.children('.target-name'), target);
				$ul.append($li);
				// 子コントローラも追加
				var childControllerProperties = getChildControllerProperties(target);
				if (childControllerProperties.length) {
					for (var i = 0, l = childControllerProperties.length; i < l; i++) {
						// 『コントローラ名#定義名』を覚えさせておく
						var p = childControllerProperties[i];
						var controller = target[p];
						controller.__controllerContext.devtool = controller.__controllerContext.devtool
								|| {};
						controller.__controllerContext.devtool.instanceName = target.__name + '#'
								+ p;
						view.append($li, 'target-list');
						this.appendTargetToList(controller, $li.find('ul:last'));
					}
				}
				// ロジックを列挙して追加
				var isAppendedLogiccUl = false;
				for ( var p in target) {
					if (h5.u.str.endsWith(p, 'Logic')) {
						// ロジックがある場合、ロジックのulを追加
						if (!isAppendedLogiccUl) {
							view.append($li, 'target-list');
							isAppendedLogiccUl = true;
						}
						// 『コントローラ名#定義名』を覚えさせておく
						target[p].__logicContext.devtool = target[p].__logicContext.devtool || {};
						target[p].__logicContext.devtool.instanceName = target.__name + '#' + p;
						this.appendTargetToList(target[p], $li.find('ul:last'));
					}
				}
			} else {
				// ロジックの場合
				// コントローラ名とログ用のObserbableArrayを持たせる
				target.__logicContext.devtool = target.__logicContext.devtool || {
					name: target.__name,
					devtoolLog: createLogArray()
				};
				var $li = $(view.get('target-list-part', {
					name: target.__name,
					cls: 'root'
				}), $ul[0].ownerDocument);

				// データにロジックを持たせる
				this.setTargetToElem($li.children('.target-name'), target);

				// 子コントローラの後にロジック追加
				$ul.append($li);
			}
		},
		/**
		 * コントローラをコントローラリストから削除
		 *
		 * @memberOf h5.devtool.ControllerInfoController
		 * @param controller
		 */
		removeControllerList: function(controller) {
			var that = this;
			this.$find('.targetlist .target-name').each(function() {
				if (that.getTargetFromElem(this) === controller) {
					$(this).closest('li').remove();
					return false;
				}
			});
		}
	};
	h5.core.expose(controllerInfoController);

	/**
	 * デバッガの設定を行うコントローラ
	 *
	 * @name h5.devtool.SettingsController
	 */
	var settingsController = {
		/**
		 * @memberOf h5.devtool.SettingsController
		 */
		__name: 'h5.devtool.SettingsController',

		/**
		 * @memberOf h5.devtool.SettingsController
		 */
		__ready: function() {
			// settingsをバインドする
			view.bind(this.rootElement, h5devtoolSettings);

			// -------------------------------------------------
			// デバッガ設定変更時のイベント
			// -------------------------------------------------
			h5devtoolSettings.addEventListener('change', function(e) {
				for ( var p in e.props) {
					var val = e.props[p].newValue;
					switch (p) {
					case 'LogMaxNum':
						for (var i = 0, l = logArrays.length; i < l; i++) {
							if (val >= logArrays[i].length) {
								continue;
							}
							logArrays[i].splice(0, logArrays[i].length - val);
						}
					}
				}
			});
		},
		/**
		 * @memberOf h5.devtool.SettingsController
		 */
		'.set click': function() {
			var setObj = {};
			this.$find('input').each(function() {
				setObj[this.name] = this.value;
			});
			var error = h5devtoolSettings.validate(setObj);
			if (!error) {
				h5devtoolSettings.set(setObj);
				return;
			}
			// validateが通らない場合
			// 今はログ表示件数しか設定項目がないが、増えた場合はvalidateエラーメッセージを作成する
			devtoolWindow.alert('ログの最大表示件数は0以上の整数値で入力してください');
		}
	};
	h5.core.expose(settingsController);

	/**
	 * トレースログ、ロガーの共通処理を抜き出したコントローラ
	 *
	 * @name h5.devtool.BaseLogConttoller
	 */
	var baseLogController = {
		/**
		 * @memberOf h5.devtool.BaseLogController
		 */
		__name: 'h5.devtool.BaseLogController',

		/**
		 * 右クリックコントローラ
		 */
		_contextMenuController: h5.devtool.ui.ContextMenuController,

		/**
		 * ログリストが一番下までスクロールされているかどうか
		 *
		 * @memberOf h5.devtool.BaseLogController
		 */
		_isScrollLast: false,

		/**
		 * ログ配列
		 *
		 * @memberOf h5.devtool.BaseLogController
		 */
		_logArray: null,

		/**
		 * logArrayからHTMLに変換する関数 setCreateHTMLで登録する
		 *
		 * @memberOf h5.devtool.BaseLogController
		 */
		_createLogHTML: function() {
		// setCreateHTMLで登録される。初期値はダミーのから関数
		},

		_selectLogObject: null,

		_parentControllerCtrlInfoCtrl: null,

		__ready: function(context) {
			this._contextMenuController.contextMenuExp = '.logContextMenu';
			this._contextMenuController.setFilter('*:not(.trace-list>li>*)');

			// ControllerInfoControllerを参照できるように覚えておく
			this._parentControllerCtrlInfoCtrl = context.args._parentControllerCtrlInfoCtrl
					|| this.parentController.parentController._controllerInfoController;
		},
		/**
		 * ログ配列のセット
		 *
		 * @memberOf h5.devtool.BaseLogController
		 */
		setLogArray: function(logArray, target) {
			logArray._viewBindTarget = target;
			this._logArray = logArray;
			// logArrayにハンドラを登録して、ログの更新があった時にdispatchEventしてもらう
			logArray.addEventListener('logUpdate', this.own(this._update));
			if (this._logArray.length) {
				this._updateView();
			}
			// scrollイベントはバブリングしないので、要素追加後にbindでイベントハンドラを追加
			$(target).bind('scroll', this.ownWithOrg(function(elm, ev) {
				// 一番下までスクロールされているか。30pxの余裕を持たせて判定
				this._isScrollLast = elm.scrollTop > elm.scrollHeight - elm.clientHeight - 30;
			}));
		},
		setCreateLogHTML: function(func) {
			this._createLogHTML = func;
		},
		_update: function() {
			// ログ出力箇所が表示されていなければ(タブがactiveになっていなければ)なにもしない
			if (!$(this.rootElement).hasClass('active')) {
				return;
			}

			// ログを更新する。
			// 前のlogUpdateがLOG_DELAYミリ秒以内であれば、前のログも合わせてLOG_DELAYミリ秒後に表示する
			// LOG_DELAYミリ秒の間隔をあけずに立て続けにlogUpdateが呼ばれた場合はログは出ない。
			// LOG_DELAYミリ秒の間にlogUpdateが呼ばれなかった時に今まで溜まっていたログを出力する。
			// ただし、MAX_LOG_DELAY経ったら、logUpdateの間隔に関わらずログを出力する

			// LOG_DELAYミリ秒後に出力するタイマーをセットする。
			// すでにタイマーがセット済みなら何もしない(セット済みのタイマーで出力する)
			var logArray = this._logArray;
			logArray._logUpdatedInMaxDelay = true;
			if (logArray._logDelayTimer) {
				clearTimeout(logArray._logDelayTimer);
			}
			logArray._logDelayTimer = setTimeout(this.own(function() {
				this._updateView();
			}), LOG_DELAY);
		},
		_updateView: function() {
			// このコントローラがdisposeされていたら何もしない(非同期で呼ばれるメソッドなのであり得る)
			if (isDisposed(this)) {
				return;
			}
			var logArray = this._logArray;
			clearTimeout(logArray._logDelayTimer);
			clearTimeout(logArray._logMaxDelayTimer);
			logArray._logDelayTimer = null;
			logArray._logMaxDelayTimer = null;

			// ポップアップウィンドウのDOM生成がIEだと重いのでinnerHTMLでやっている。
			// innerHTMLを更新(html()メソッドが重いので、innerHTMLでやっている)
			var logList = logArray._viewBindTarget;
			if (logList) {
				logList.innerHTML = this._createLogHTML(logArray);
			}

			// 元々一番下までスクロールされていたら、一番下までスクロールする
			if (this._isScrollLast) {
				logList.scrollTop = logList.scrollHeight - logList.clientHeight;
			}

			// MAX_LOG_DELAYのタイマーをセットする
			logArray._logUpdatedInMaxDelay = false;
			logArray._logMaxDelayTimer = setTimeout(this.own(function() {
				if (logArray._logUpdatedInMaxDelay) {
					this._updateView();

				}
			}), MAX_LOG_DELAY);
		},

		'{rootElement} tabSelect': function() {
			this._updateView();
		},

		'{rootElement} showCustomMenu': function(context) {
			this._unselect();
			var orgContext = context.evArg.orgContext;
			var $li = $(orgContext.event.target).closest('li');
			$li.addClass('selected');
			this._selectLogObject = this._logArray.get($li.attr('data-h5devtool-logindex'));
		},

		'{rootElement} hideCustomMenu': function(context) {
			this._unselect();
		},

		_unselect: function() {
			this.$find('.trace-list>li').removeClass('selected');
		},

		'.showFunction click': function(context, $el) {
			// エレメントからログオブジェクトを取得
			// コントローラまたはロジックを取得
			var ctrlOrLogic = this._selectLogObject.target;
			var ctrlInfoCtrl = this._parentControllerCtrlInfoCtrl;
			// コントローラタブに切替
			var $controllerTab = $(this.rootElement).parents('.h5devtool').find(
					'*[data-tab-page="controller-info"]');
			if (!$controllerTab.hasClass('active')) {
				$controllerTab.trigger('click');
			}

			// 対応するコントローラまたはロジックを選択
			ctrlInfoCtrl.$find('.target-name').each(function() {
				if (ctrlInfoCtrl.getTargetFromElem(this) === ctrlOrLogic) {
					$(this).trigger('mouseover');
					$(this).trigger('click');
					return false;
				}
			});


			// 詳細コントローラバインド後なので、以降は非同期で処理する
			var message = this._selectLogObject.message;
			setTimeout(function() {
				// メソッドまたはイベントハンドラタブを選択
				// メソッド名を取得
				var method = $.trim(message.slice(message.indexOf('#') + 1));
				// ログメッセージからイベントハンドラなのかメソッドなのか判定する
				// メソッド名に空白文字がありかつターゲットがコントローラならイベントハンドラ
				var isEventHandler = method.indexOf(' ') !== -1 && ctrlOrLogic.__controllerContext;
				var tabCls = isEventHandler ? 'eventHandler' : 'method';
				// イベントハンドラまたはメソッドのタブを選択
				var $tab = ctrlInfoCtrl.$find('.instance-detail>.nav-tabs>*[data-tab-page="'
						+ tabCls + '"]');
				if (!$tab.hasClass('active')) {
					$tab.trigger('click');
				}
				var $activeList = ctrlInfoCtrl.$find('.instance-detail .' + tabCls
						+ ' .method-list');


				// 該当箇所までスクロール
				scrollByMethodName($activeList, method, true);
			}, 0);
		}
	};
	h5.core.expose(baseLogController);

	/**
	 * トレースログコントローラ<br>
	 *
	 * @name h5.devtool.TraceLogController
	 */
	var traceLogController = {
		/**
		 * @memberOf h5.devtool.TraceLogController
		 */
		__name: 'h5.devtool.TraceLogController',
		/**
		 * 表示する条件を格納するオブジェクト
		 *
		 * @memberOf h5.devtool.TraceLogController
		 */
		_condition: {
			filterStr: '',
			exclude: false,
			hideCls: {}
		},

		/**
		 * ログ出力共通コントローラ
		 *
		 * @memberOf h5.devtool.BaseLogController
		 */
		baseController: baseLogController,

		/**
		 * @memberOf h5.devtool.TraceLogController
		 * @param context.evArg.logArray logArray
		 */
		__ready: function(context) {
			view.update(this.rootElement, 'trace');
			this.baseController.setCreateLogHTML(this.own(this._createLogHTML));
			this.baseController.setLogArray(context.args.traceLogs, this.$find('.trace-list')[0]);
		},
		_createLogHTML: function(logArray) {
			var str = this._condition.filterStr;
			var reg = this._condition.filterReg;
			var isExclude = this._condition.filterStr && this._condition.exclude;
			var hideCls = this._condition.hideCls;

			var html = '';
			// TODO view.getが重いので、文字列を直接操作する
			// (view.get, str.formatを1000件回してIE10で20msくらい。ただの文字列結合なら10msくらい)

			for (var i = 0, l = logArray.length; i < l; i++) {
				var logObj = logArray.get(i);
				var part = view.get('trace-list-part', logObj);
				// index番号を覚えさせる
				part = $(part).attr('data-h5devtool-logindex', i)[0].outerHTML;
				// フィルタにマッチしているか
				if (!isExclude === !(reg ? logObj.message.match(reg)
						: logObj.message.indexOf(str) !== -1)) {
					html += $(part).css('display', 'none')[0].outerHTML;
					continue;
				} else if (hideCls && hideCls[logObj.cls]) {
					// クラスのフィルタにマッチしているか
					part = $(part).css('display', 'none')[0].outerHTML;
				}

				html += part;
			}
			return html;
		},
		'input[type="checkbox"] change': function(context, $el) {
			var cls = $el.attr('name');
			if ($el.prop('checked')) {
				this._condition.hideCls[cls] = false;
			} else {
				this._condition.hideCls[cls] = true;
			}
			this.refresh();
		},
		/**
		 * フィルタを掛ける
		 *
		 * @memberOf h5.devtool.TraceLogController
		 */
		'input.filter keydown': function(context) {
			// エンターキー
			if (context.event.keyCode === 13) {
				var val = this.$find('input.filter').val();
				if (!val) {
					return;
				}
				this._executeFilter(val);
				this.$find('.filter-clear').prop('disabled', false);
			}
		},
		/**
		 * 入力欄が空になったらフィルタを解除
		 *
		 * @memberOf h5.devtool.TraceLogController
		 */
		'input.filter keyup': function(context) {
			// エンターキー
			var val = this.$find('input.filter').val();
			if (val === '') {
				this._executeFilter('');
			}
		},
		'button.filter-show click': function(context) {
			var val = this.$find('input.filter').val();
			if (!val) {
				return;
			}
			this._executeFilter(val);
			this.$find('.filter-clear').prop('disabled');
		},
		'button.filter-hide click': function(context) {
			var val = this.$find('input.filter').val();
			if (!val) {
				return;
			}
			this._executeFilter(val, true);
			this.$find('.filter-clear').prop('disabled');
		},
		'button.filter-clear click': function(context) {
			this._executeFilter('');
			this.$find('.filter-clear').prop('disabled', true);
		},
		_executeFilter: function(val, execlude) {
			this._condition.filterStr = val;
			this._condition.filterReg = val.indexOf('*') !== -1 ? getRegex(val) : null;
			this._condition.exclude = !!execlude;
			this.refresh();
		},

		/**
		 * 表示されているログについてフィルタを掛けなおす
		 *
		 * @memberOf h5.devtool.TraceLogController
		 */
		refresh: function() {
			this.$find('.trace-list')[0].innerHTML = this
					._createLogHTML(this.baseController._logArray);
		}
	};
	h5.core.expose(traceLogController);

	/**
	 * ロガーコントローラ
	 *
	 * @name h5.devtool.LoggerController
	 */
	var loggerController = {
		/**
		 * @memberOf h5.devtool.LoggerController
		 */
		__name: 'h5.devtool.LoggerController',

		/**
		 * ログ出力共通コントローラ
		 *
		 * @memberOf h5.devtool.LoggerController
		 */
		baseController: h5.devtool.BaseLogController,

		/**
		 * @memberOf h5.devtool.BaseLogController
		 */
		_logArray: null,

		/**
		 * @memberOf h5.devtool.LoggerController
		 * @param context
		 */
		__ready: function(context) {
			this.baseController.setCreateLogHTML(this.own(this._createLogHTML));
			this.baseController.setLogArray(context.args.loggerArray, this.rootElement);

			//--------------------------------------------
			// window.onerrorで拾った例外も出すようにする
			// (bindするのはwindowはディベロッパウィンドウのwindowじゃなくてアプリ側のwindowオブジェクト)
			// unbindするときのためにコントローラでハンドラを覚えておく
			//--------------------------------------------
			this._onnerrorHandler = this.own(function(ev) {
				var message = ev.originalEvent.message;
				var file = ev.originalEvent.fileName || '';
				var lineno = ev.originalEvent.lineno || '';

				loggerArray.push({
					levelString: 'EXCEPTION',
					date: new Date(),
					args: ['{0} {1}:{2}', message, file, lineno]
				});
				this.baseController._updateView();
			});
			$(window).bind('error', this._onnerrorHandler);
		},

		/**
		 * Log出力するHTML文字列を作成
		 *
		 * @memberOf h5.devtool.LoggerController
		 * @param logArray
		 * @returns {String}
		 */
		_createLogHTML: function(logArray) {
			var html = '';
			for (var i = 0, l = logArray.length; i < l; i++) {
				var obj = logArray.get(i);
				var msg = '[' + obj.levelString + ']' + timeFormat(obj.date) + ' '
						+ h5.u.str.format.apply(h5.u.str, obj.args);
				var cls = obj.levelString;
				html += '<p class="' + cls + '">' + msg + '</p>';

			}
			return html;
		},

		/**
		 * @memberOf h5.devtool.LoggerController
		 */
		__unbind: function() {
			// コントローラのハンドラがunbindされるときにerrorハンドラもunbindする
			$(window).unbind('error', this._onnerrorHandler);
		}
	};
	h5.core.expose(loggerController);

	/**
	 * タブコントローラ タブ表示切替をサポートする
	 *
	 * @name h5.devtool.TabController
	 */
	var tabController = {
		/**
		 * @memberOf h5.devtool.TabController
		 */
		__name: 'h5.devtool.TabController',
		/**
		 * @memberOf h5.devtool.TabController
		 */
		__ready: function() {
			// 非アクティブのものを非表示
			this.$find('tab-content').not('.active').css('display', 'none');
		},
		/**
		 * 指定されたクラスのタブへ切替
		 *
		 * @param {String} tabClass タブのクラス名
		 */
		selectTab: function(tabClass) {
			this.$find('.nav-tabs li.' + tabClass).trigger('click');
		},
		/**
		 * タブをクリック
		 *
		 * @memberOf h5.devtool.TabController
		 * @param context
		 * @param $el
		 */
		'.nav-tabs li click': function(context, $el) {
			if ($el.hasClass('active')) {
				return;
			}
			var $navTabs = $el.parent();
			$navTabs.find('>.active').removeClass('active');
			$el.addClass('active');
			var targetContent = $el.data('tab-page');
			var $tabContentsRoot = $el.closest('.nav-tabs').next();
			$tabContentsRoot.find('>.active').removeClass('active');
			var $selectedContents = $tabContentsRoot.find('>.' + targetContent);
			$selectedContents.addClass('active');
			this.trigger('tabChange', targetContent);
			$selectedContents.trigger('tabSelect');
		}
	};
	h5.core.expose(tabController);

	/**
	 * ディベロッパツールコントローラ
	 *
	 * @name h5.devtool.DevtoolController
	 */
	var devtoolController = {
		/**
		 * @memberOf h5.devtool.DevtoolController
		 */
		__name: 'h5.devtool.DevtoolController',
		/**
		 * @memberOf h5.devtool.DevtoolController
		 */
		win: null,
		/**
		 * @memberOf h5.devtool.DevtoolController
		 */
		_controllerInfoController: h5.devtool.ControllerInfoController,

		/**
		 * @memberOf h5.devtool.DevtoolController
		 */
		_tabController: h5.devtool.TabController,
		/**
		 * @memberOf h5.devtool.DevtoolController
		 */
		_traceLogController: h5.devtool.TraceLogController,
		/**
		 * @memberOf h5.devtool.DevtoolController
		 */
		_loggerController: h5.devtool.LoggerController,
		/**
		 * @memberOf h5.devtool.DevtoolController
		 */
		_settingsController: h5.devtool.SettingsController,
		/**
		 * @memberOf h5.devtool.DevtoolController
		 */
		__meta: {
			_controllerInfoController: {
			// rootElementは__constructで追加してから設定している
			},
			_traceLogController: {},
			_settingsController: {},
			_loggerController: {}
		},
		/**
		 * @memberOf h5.devtool.DevtoolController
		 */
		__construct: function(context) {
			this.win = context.args.win;
			// 必要な要素を追加

			// 全体を包むタブの中身を追加
			view.append(this.rootElement, 'devtool-tab');
			view.append(this.$find('.controller-info'), 'controllerInfoWrapper');
			view.append(this.$find('.settings'), 'settings');
			this.__meta._controllerInfoController.rootElement = this.$find('.controller-info');
			this.__meta._traceLogController.rootElement = this.$find('.trace');
			this.__meta._loggerController.rootElement = this.$find('.logger');
			this.__meta._settingsController.rootElement = this.$find('.settings');

			// -------------------------------------------------
			// ロガーをフックする
			// -------------------------------------------------
			h5.settings.log = {
				target: {
					view: {
						type: {
							log: function(obj) {
								var args = obj.args;
								if (args[1] && typeof args[1] === 'string'
										&& args[1].indexOf('h5.devtool.') === 0) {
									// ディベロッパツールが吐いてるログは出力しない
									return;
								}
								loggerArray.push(obj);
								loggerArray.dispatchEvent({
									type: 'logUpdate'
								});
							}
						}
					}
				},
				out: [{
					category: '*',
					targets: ['view']
				}]
			};
			h5.log.configure();
		},

		/**
		 * キー操作
		 *
		 * @memberOf h5.devtool.DevtoolController
		 */
		'{document} keydown': function(context) {
			var event = context.event;
			var key = event.keyCode;
			if (key === 116 && useWindowOpen) {
				// F5キーによる更新の防止
				context.event.preventDefault();
			}
		},

		/**
		 * 何もない箇所をクリック
		 *
		 * @memberOf h5.devtool.DevtoolController
		 */
		'.left click': function(context, $el) {
			if (context.event.target !== $el[0]) {
				return;
			}
			this.trigger('leftclick');
		},
		/**
		 * 閉じるボタン(モバイル用) 閉じて、オーバレイも消える。
		 *
		 * @memberOf h5.devtool.DevtoolController
		 */
		'{.h5devtool-controllBtn.opencloseBtn.closeTool} click': function(context, $el) {
			$el.text('▼').removeClass('closeTool').addClass('openTool');
			$('.h5devtool-controllBtn').not($el).css('display', 'none');
			$(this.rootElement).css('display', 'none');
			this.trigger('close');
		},
		/**
		 * 開くボタン(モバイル用)
		 *
		 * @memberOf h5.devtool.DevtoolController
		 */
		'{.h5devtool-controllBtn.opencloseBtn.openTool} click': function(context, $el) {
			$el.text('×').removeClass('openTool').addClass('closeTool');
			$('.h5devtool-controllBtn').not($el).css('display', 'inline-block');
			$(this.rootElement).css('display', 'block');
			$('.h5devtool-controllBtn.showhideBtn.showTool').trigger('click');
			this.trigger('open');
		},

		/**
		 * 隠すボタン(モバイル用)
		 * <p>
		 * オーバレイを隠す。タブレット版の場合はディベロッパツールも隠す。
		 * </p>
		 *
		 * @memberOf h5.devtool.DevtoolController
		 */
		'{.h5devtool-controllBtn.showhideBtn.hideTool} click': function(context, $el) {
			$el.text('↓').removeClass('hideTool').addClass('showTool');
			if (!useWindowOpen) {
				$(this.rootElement).css({
					display: 'none'
				});
			}
		},
		/**
		 * 見るボタン(モバイル用)
		 *
		 * @memberOf h5.devtool.DevtoolController
		 */
		'{.h5devtool-controllBtn.showhideBtn.showTool} click': function(context, $el) {
			$el.text('↑').removeClass('showTool').addClass('hideTool');
			if (!useWindowOpen) {
				$(this.rootElement).css({
					display: ''
				});
			}
		}
	};
	h5.core.expose(devtoolController);

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	// ログを出力する
	fwLogger.info('hifive Developer Tool(ver.{0})の読み込みが完了しました。', H5_DEV_TOOL_VERSION);

	// アスペクトを掛ける
	// TODO アスペクトでやるのをやめる。
	// アスペクトだと、メソッドがプロミスを返した時が分からない。(プロミスがresolve,rejectされた時に初めてpostに入るので。)
	var preTarget = null;
	var preTargetDevtoolContext = null;
	var aspect = {
		target: '*',
		interceptors: h5.u.createInterceptor(function(invocation, data) {
			var target = invocation.target;
			if (isDevtoolWindowClosed || isDisposed(target)
					|| h5.u.str.startsWith(target.__name, 'h5.devtool')) {
				// ディベロッパウィンドウが閉じられた、またはdisposeされた、またはDevtoolのコントローラなら何もしない
				return invocation.proceed();
			}

			// 関数名を取得
			var fName = invocation.funcName;

			// ControllerInfoControllerがバインドされる前にバインドされたコントローラの場合
			// devtoolコンテキストがないので追加
			var devtoolContext = getDevtoolContext(target);

			// ログのインデントレベルを設定
			devtoolContext.indentLevel = devtoolContext.indentLevel || 0;
			// メソッドの呼び出し回数をカウント
			var methodCount = devtoolContext.methodCount;
			if (!methodCount) {
				methodCount = new MethodCount(target);
				devtoolContext.methodCount = methodCount;
			}
			methodCount.count(fName);

			var indentLevel = devtoolContext.indentLevel;
			var cls = '';
			if (fName.indexOf(' ') !== -1 && target.__controllerContext) {
				// コントローラかつ空白を含むメソッドの場合はイベントハンドラ
				cls = 'event';
			} else if ($.inArray(fName, LIFECYCLE_METHODS) !== -1 && target.__controllerContext) {
				// ライフサイクルメソッド
				cls = 'lifecycle';
			} else if (fName.indexOf('_') === 0) {
				// '_'始まりならprivate
				cls = 'private';
			} else {
				// それ以外はpublic
				cls = 'public';
			}

			// BEGINを出力したターゲットのログを覚えておいてENDの出力場所が分かるようにする
			// 全体のトレースログ以外で、ログを出した場所を覚えさせておく
			data.beginLog = [];

			// ログを保持する配列をターゲットに持たせる
			if (!devtoolContext.devtoolLog) {
				devtoolContext.devtoolLog = createLogArray();
			}

			// 呼び出し元のターゲットにもログを出す(ただし呼び出し元がdispose済みなら何もしない)
			if (preTarget && preTarget !== target && preTargetDevtoolContext) {
				var logObj = createLogObject(target, target.__name + '#' + fName, cls, 'BEGIN', '',
						preTargetDevtoolContext.indentLevel);
				addLogObject(preTargetDevtoolContext.devtoolLog, logObj);
				preTargetDevtoolContext.indentLevel += 1;
				data.beginLog.push({
					target: preTarget,
					logObj: logObj
				});
			}

			// ターゲットのログ
			var logObj = createLogObject(target, fName, cls, 'BEGIN', '', indentLevel);
			data.logObj = logObj;
			addLogObject(devtoolContext.devtoolLog, logObj);
			devtoolContext.indentLevel += 1;
			data.beginLog.push({
				target: target,
				logObj: logObj
			});

			// コントローラ全部、ロジック全部の横断トレースログ
			var wholeLog = createLogObject(target, target.__name + '#' + fName, cls, 'BEGIN', '',
					wholeTraceLogsIndentLevel);
			wholeTraceLogsIndentLevel++;
			addLogObject(wholeTraceLogs, wholeLog);
			data.wholeLog = wholeLog;

			preTarget = target;
			preTargetDevtoolContext = devtoolContext;
			return invocation.proceed();
		}, function(invocation, data) {
			var target = invocation.target;
			if (isDevtoolWindowClosed || isDisposed(target)) {
				// devtoolウィンドウが閉じた、またはdisposeされたターゲットの場合は何もしない
				// target.__nameがない(===disposeされた)場合は何もしない
				return;
			}
			if (h5.u.str.startsWith(target.__name, 'h5.devtool')) {
				return;
			}
			var devtoolContext = getDevtoolContext(target);
			devtoolContext.indentLevel = devtoolContext.indentLevel || 0;

			// プロミスの判定
			// penddingのプロミスを返した時はPOSTに入ってこないので、RESOLVEDかREJECTEDのどっちかになる。
			var ret = invocation.result;
			var isPromise = ret && $.isFunction(ret.promise) && !h5.u.obj.isJQueryObject(ret)
					&& $.isFunction(ret.done) && $.isFunction(ret.fail);
			var promiseState = '';
			var tag = 'END';
			if (isPromise) {
				tag = 'DFD';
				// すでにresolve,rejectされていたら状態を表示
				if (ret.state() === 'resolved') {
					promiseState = '(RESOLVED)';
				} else if (ret.state() === 'rejected') {
					promiseState = '(REJECTED)';
				}
			}

			var time = timeFormat(new Date());

			// BEGINのログを出したターゲット(コントローラまたはロジック)にログを出す
			if (data.beginLog) {
				for (var i = 0, l = data.beginLog.length; i < l; i++) {
					var t = data.beginLog[i].target;
					var logObj = $.extend({}, data.beginLog[i].logObj);
					logObj.tag = tag;
					logObj.promiseState = promiseState;
					logObj.time = time;
					// プロミスならインデントを現在のインデント箇所で表示
					logObj.indentWidth = isPromise ? 0 : logObj.indentWidth;
					addLogObject(getDevtoolContext(t).devtoolLog, logObj);
					getDevtoolContext(t).indentLevel -= 1;
				}
			}

			// コントローラ全部、ロジック全部の横断トレースログにログオブジェクトの登録
			var wholeLog = $.extend({}, data.wholeLog);
			wholeLog.tag = tag;
			wholeLog.promiseState = promiseState;
			wholeLog.time = time;
			wholeLog.indentWidth = isPromise ? 0 : wholeLog.indentWidth;
			addLogObject(wholeTraceLogs, wholeLog);
			wholeTraceLogsIndentLevel -= 1;
			preTarget = null;
			preTargetDevtoolContext = null;
		}),
		pointCut: '*'
	};
	compileAspects(aspect);
	h5.settings.aspects = [aspect];

	// -------------------------------------------------
	// コントローラのバインド
	// -------------------------------------------------
	$(function() {
		openDevtoolWindow()
				.done(function(win) {
					devtoolWindow = win;
					h5.core.controller($(win.document).find('.h5devtool'), devtoolController, {
						win: win,
						// 全体のトレースログ
						traceLogs: wholeTraceLogs,
						// ロガー
						loggerArray: loggerArray

					}).readyPromise.done(function() {
						// 閉じられたときにdevtoolControllerをdispose
						var controller = this;
						function unloadFunc() {
							// オーバレイを削除
							controller._controllerInfoController.removeOverlay(true);
							// コントローラをdispose
							controller.dispose();
							// devtoolウィンドウが閉じられたフラグを立てる
							// 以降、devtool用のアスペクトは動作しなくなる
							isDevtoolWindowClosed = true;
						}
						// unloadFuncのバインドを行う
						// jQuery1系でIEを使用するとエラーが起きるので、nativeでバインドしている。
						// # jQuery1系でIEの場合、unload時にjQueryがjQueryキャッシュを削除しようとする。
						// # win.jQuery111012331231のようなオブジェクトをdeleteで消そうとしていて、
						// # IEの場合はwindowオブジェクトに対してdeleteできないのでエラーになる。
						// # windowの場合はdeleteを使用しないようになっているが、別windowの場合はdeleteが使われてしまう。
						bindListener(win, 'unload', unloadFunc);
						if (win != window) {
							// 親ウィンドウが閉じた時(遷移した時)にDevtoolウィンドウを閉じる。
							// IEの場合、明示的にclose()を呼ばないと遷移先でwindow.open()した時に新しく開かずに閉じていないDevtoolウィンドウが取得されてしまうため。
							bindListener(window, 'unload', function() {
								win.close();
							});
						}
					});
				})
				.fail(
						function(reason) {
							// ポップアップブロックされると失敗する
							// アラートをだして何もしない
							if (reason === 'block') {
								alert('[hifive Developer Tool]\n別ウィンドウのオープンに失敗しました。ポップアップブロックを設定している場合は一時的に解除してください。');
							}
						});
	});
})(jQuery);
