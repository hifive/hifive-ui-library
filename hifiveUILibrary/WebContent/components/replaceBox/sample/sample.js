$(function(){
	var outerBoxController = {

		__name: 'OuterBoxController',

		replaceBoxController: h5.ui.container.ReplaceBoxController,

		__meta : {
			replaceBoxController: {
				rootElement: '> .replaceBox'
			},
		},

		__init: function(context){
			for(var key in this.replaceBoxController._transition){
				if(key[0] == '_') continue;
				this.$find('select').append('<option value="' + key + '">' + key + '</option>');
			}
		},

		'> .replaceBox click' : function(){
			var ul = $('<ul></ul>');
			test(ul);
			var element = $('<div style="background-color:#0066ff;"></div>');
			element.append(ul);
			var input = this.$find('select')[0];
			var transition = input.options[input.selectedIndex].value;
			var that = this;
			this.replaceBoxController.replace(element,{
				completeCallback: function(old, current){
					//replaceBoxCompleteイベントでも可能。
					//current.css('background-color', '#0000ff');
				},
				//transitionNameプロパティを直に更新することでも可能。
				//transition : transition
				_:null
			});
		},

		//replaceBoxCompleteイベント
		'{rootElement} replaceBoxComplete' : function(context){
			var old = context.evArg.old;
			var current = context.evArg.current;
			current.css('font-size', 'xx-large');
		},

		'select change' : function(context){
			var target = context.event.target;
			//transitionNameプロパティを直に更新
			this.replaceBoxController.transitionName = target.options[target.selectedIndex].value;
		}
	};

	$('.outerBox').each(function(){
		h5.core.controller(this, outerBoxController);
	});
});