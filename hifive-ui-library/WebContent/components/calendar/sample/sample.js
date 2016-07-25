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
$(function(){
	var mainController = {

		__name : 'h5.ui.container.MainController',

		__templates: 'sample.ejs',

		calendarController: h5.ui.components.Calendar,

		__meta : {
			calendarController: {
				rootElement: '#container'
			},
		},

		__init: function(context){
			var date = new Date();
			this.view.append('#yearSelect', 'yearSelect');
			this.view.append('#monthSelect', 'monthSelect');
			this.view.append('#daySelect', 'daySelect', {date : date});

			this.$find('#spnSelectedDate').html(date.toLocaleDateString());
			this.$find('#spnToday').html(date.toLocaleDateString());

		},

		//---------任意の年月を設定する----------

		// カレンダーで選択すると、Select要素を更新する
//		'#container syncWithCalendar': function(context) {
//			var date = context.evArg.date;
//			this.$find('#yearSelect').val(date.getFullYear());
//			this.$find('#monthSelect').val(date.getMonth() + 1);
//			this.$find('#daySelect').val(date.getDate());
//			this.$find('#spnSelectedDate').html(date.toLocaleDateString());
//		},

		// 年を指定する
		'#yearSelect change': function() {
			var date = this._getDateInfo();
			this.calendarController.setYear(date.getFullYear());
		},

		// 月を指定する
		'#monthSelect change': function() {
			var date = this._getDateInfo();
			this.calendarController.setMonth(date.getMonth());
		},

		'#btnGoToToday click': function() {
			var date = new Date();
			this.calendarController.setCalendar(date.getFullYear(), date.getMonth());
		},

		// Select要素から、ユーザを選択する日付を取得する
		_getDateInfo: function(){
			var year = this.$find('#yearSelect').val();
			var month = this.$find('#monthSelect').val() - 1;
			return new Date(year, month, 1);
		},

		//-------選択するモードを変更する--------
		'#selSelectMode change': function() {
			this.calendarController.setSelectMode(this.$find('#selSelectMode').val());
		},

		// ---------選択できない日付を指定する------------------
		'#btnUnselectableDate click': function(){
			var dates = this.calendarController.getSelectedDate();
			this.calendarController.setSelectable(dates, false);
		},

		'#btnUnselectableDateReset click': function(){
			this.calendarController.setSelectable();
		},

		//----------CSSでカスタマイズ機能------------------

		// 特定の１日のスタイルに、CSSでカスタマイズ
		'#btnDateCssAdd click': function() {
			var dates = this.calendarController.getSelectedDate();
			//for (var i=0; i<dates.length; i++) {
				this.calendarController.setCssClass(dates, this.$find("#selCssDate").val());
			//}
		},

		// 週間の日のスタイルにCSSでカスタマイズ
		'#btnCssDow click': function() {
			this.calendarController.setCssClassForDow(this.$find('#selDowName').val(), this.$find("#selCssDowName").val());
		},

		// ---------特別の日付を指定する------------------
		'#chkMarkDate change': function(){
			var dates = this.calendarController.getSelectedDate();
			var isMarker = this.$find('#chkMarkDate').is(':checked');
			for (var i=0; i<dates.length; i++) {
				this.calendarController.setMarker(dates[i], isMarker);
			}
		},

		'#btnSetTextDate click': function(){
			var dates = this.calendarController.getSelectedDate();
			var data = this.$find('#txtContentDate').val();
			for (var i=0; i<dates.length; i++) {
				this.calendarController.setTooltip(dates[i], data);
			}
		},
	};

	h5.core.controller('#body', mainController);

});