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
$(function() {
	h5.core.controller('.magnet-wrapper', h5.ui.components.MagnetContainer.MagnetController).readyPromise
			.done(function() {
				// 動的追加
				$('.magnet-wrapper').append('<div class="sample purple"></div>');
				$('.magnet-wrapper').append('<div class="sample gray"></div>');

				// 初期位置を離して設置
				$('.sample').each(function(i) {
					$(this).css({
						top: 200 * parseInt(i / 3),
						left: 200 * (i % 3)
					});
				});

			});
});