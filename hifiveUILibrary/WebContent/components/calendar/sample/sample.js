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

			$('#spnSelectedDate').html(date.toLocaleDateString());
			$('#spnToday').html(date.toLocaleDateString());

		},

		//---------任意の年月を設定する----------

		// カレンダーで選択すると、Select要素を更新する
		'#container syncWithCalendar': function(context) {
			var date = context.evArg.date;
			$('#yearSelect').val(date.getFullYear());
			$('#monthSelect').val(date.getMonth() + 1);
			$('#daySelect').val(date.getDate());
			$('#spnSelectedDate').html(date.toLocaleDateString());
		},

		'.changeDate change': function(context) {
			var date = this._getDateInfo();
			this.calendarController.setFirstDate(date);
			this.view.update('#daySelect', 'daySelect', {date : date} );
		},

		// 年・月・日を指定する
		'#btnSetSelectedDate click': function() {
			var date = this._getDateInfo();
			this.calendarController.setDate(date);
			this.calendarController.render();
			$('#spnSelectedDate').html(date.toLocaleDateString());
		},

		'#btnGoToSelectedDate click': function() {
			var date = this._getDateInfo();
			this.calendarController.setFirstDate(date);
		},

		'#btnGoToToday click': function() {
			var date = new Date();
			this.calendarController.setFirstDate(date);
		},

		// Select要素から、ユーザを選択する日付を取得する
		_getDateInfo: function(){
			return new Date($('#yearSelect').val(), $('#monthSelect').val() - 1, $('#daySelect').val());
		},

		//-------選択するモードを変更する--------
		'#selSelectMode change': function() {
			this.calendarController.setSelectMode($('#selSelectMode').val());
		},

		// ---------選択できない日付を指定する------------------
		'#btnUnselectableDate click': function(){
			var dates = this.calendarController.getSelectedDate();
			this.calendarController.setUnselectedDate(dates);
		},
		'#btnUnselectableDateReset click': function(){
			this.calendarController.setUnselectedDate();
		},

		//----------CSSでカスタマイズ機能------------------

		// 特定の１日のスタイルに、CSSでカスタマイズ
		'#btnDateCssAdd click': function() {
			var dates = this.calendarController.getSelectedDate();
			//for (var i=0; i<dates.length; i++) {
				this.calendarController.setCssClass(dates, $("#selCssDate").val());
			//}
		},

		// 週間の日のスタイルにCSSでカスタマイズ
		'#btnCssDow click': function() {
			this.calendarController.setCssClassForDow($('#selDowName').val(), $("#selCssDowName").val());
		},

		// ---------特別の日付を指定する------------------

		'#btnSetSpecDate click': function(){
			var date = this._getDateInfo();
			var isMark = $('#chkMarkDate').is(':checked');
			var data = $('#txtContentDate').val();
			//var cssName = $('#selCssSpecDate').val();

			this.calendarController.setSpecialDate(date, {
				data: data,
				isMark: isMark,
				//cssName: cssName
			});
		},

		'#chkMarkDate change': function(){
			var dates = this.calendarController.getSelectedDate();
			var isMarker = $('#chkMarkDate').is(':checked');
			for (var i=0; i<dates.length; i++) {
				this.calendarController.setMarker(dates[i], isMarker);
			}
		},

		'#btnSetTextDate click': function(){
			var dates = this.calendarController.getSelectedDate();
			var data = $('#txtContentDate').val();
			for (var i=0; i<dates.length; i++) {
				this.calendarController.setText(dates[i], data);
			}
		},
	};

	h5.core.controller('#body', mainController);

});