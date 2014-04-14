$(function(){

	var sampleController = {

		__name: 'sampleController',

		dividedBoxController: h5.ui.container.DividedBox,

		__meta : {
			dividedBoxController: {
				rootElement: '> ._dividedBox'
			},
		},

		'.insert click' : function(){
			this.dividedBoxController.insert(1, '<div class="box" style="/*width:500px;*/background-color:orange;"></div>');
		},

		'.addDiv click' : function(){
			var dividedBox = $(this.dividedBoxController.rootElement);
			var last = dividedBox.find('.box:last').width('-=100px;');
			var addDiv = $('<div class="box" style="width:100px;background-color:orange;"></div>').css({
				position:'absolute',
				left:last.position().left + last.width()
			});
			dividedBox.append(addDiv);
		},

		'.refresh click' : function(){
			this.dividedBoxController.refresh();
		}
	};
	$('.sample').each(function(){
		h5.core.controller(this, sampleController);
	});

});