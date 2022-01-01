/*
 * View model for OctoPrint
 *
 * Amendments by: LMS0815
 * License: AGPLv3
 *
 * http://beautifytools.com/javascript-validator.php
 *
*/

$(function () {
	function bedlevelvisualizerViewModel(parameters) {
		var self = this;

		self.settingsViewModel = parameters[0];
		self.controlViewModel = parameters[1];
		self.loginStateViewModel = parameters[2];

		self.processing = ko.observable(false);
		self.mesh_data = ko.observableArray([]);
		self.mesh_data_x = ko.observableArray([]);
		self.mesh_data_y = ko.observableArray([]);
		self.mesh_data_z_height = ko.observable();
		self.save_mesh = ko.observable();
		self.save_snapshots = ko.observable(false);
		self.selected_command = ko.observable();
		self.settings_active = ko.observable(false);
		self.webcam_streamUrl = ko.computed(function(){
			if(self.processing() && self.settingsViewModel.settings.plugins.bedlevelvisualizer.show_webcam() && (self.settingsViewModel.webcam_streamUrl() !== "")) {
				return self.settingsViewModel.webcam_streamUrl();
			} else {
				return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==";
			}
		});
		self.mesh_status = ko.computed(function(){
			if(self.processing()){
				return 'Collecting mesh data.';
			}
			if (self.save_mesh() && self.mesh_data().length > 0) {
				return 'Using saved mesh data from ' + self.settingsViewModel.settings.plugins.bedlevelvisualizer.mesh_timestamp() + '.';
			} else {
				return 'Update mesh.';
			}
		});

		self.screw_hub = ko.observable();
		self.mesh_unit = ko.observable();
		self.reverse = ko.observable();
		self.showdegree = ko.observable();
		self.show_stored_mesh_on_tab = ko.observable();
		self.imperial = ko.observable();
		self.descending_x = ko.observable();
		self.descending_y = ko.observable();
		self.mesh_zero = ko.observable(0);
		self.mesh_adjustment = ko.computed(
			function() {
				var degrees = ko.utils.arrayMap(
					self.mesh_data(),
					function(line) {
					return ko.utils.arrayMap(
						line,
						function(item) {
						return ((parseFloat(item) - parseFloat(self.mesh_zero())) * parseFloat(self.mesh_unit()) * 360 / (self.imperial()?25.4/parseFloat(self.screw_hub()):parseFloat(self.screw_hub())));
						}
				);
					}
				);
				return degrees;
				},
			self);
		self.turn = ko.observable(0);
		self.graph_z_limits = ko.observable();

		self.get_cell_text = function(item) {
			return (!item.$parentContext.$parent.len?Math.abs(parseFloat(item.$parentContext.$parent.mesh[item.$root.descending_y()?item.$root.mesh_data_y().length-1-item.$parentContext.$index():item.$parentContext.$index()][item.$root.descending_x()?item.$root.mesh_data_x().length-1-item.$index():item.$index()])):parseFloat(item.$parentContext.$parent.mesh[item.$root.descending_y()?item.$root.mesh_data_y().length-1-item.$parentContext.$index():item.$parentContext.$index()][item.$root.descending_x()?item.$root.mesh_data_x().length-1-item.$index():item.$index()])).toFixed(item.$parentContext.$parent.len);
		};

		self.onBeforeBinding = function() {
			self.mesh_data(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh());
			self.mesh_data_x(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_x());
			self.mesh_data_y(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_y());
			self.mesh_data_z_height(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_z_height());
			self.save_mesh(self.settingsViewModel.settings.plugins.bedlevelvisualizer.save_mesh());
			self.save_snapshots(self.settingsViewModel.settings.plugins.bedlevelvisualizer.save_snapshots());
			self.screw_hub(self.settingsViewModel.settings.plugins.bedlevelvisualizer.screw_hub());
			self.mesh_unit(self.settingsViewModel.settings.plugins.bedlevelvisualizer.mesh_unit());
			self.reverse(self.settingsViewModel.settings.plugins.bedlevelvisualizer.reverse());
			self.showdegree(self.settingsViewModel.settings.plugins.bedlevelvisualizer.showdegree());
			self.show_stored_mesh_on_tab(self.settingsViewModel.settings.plugins.bedlevelvisualizer.show_stored_mesh_on_tab());
			self.imperial(self.settingsViewModel.settings.plugins.bedlevelvisualizer.imperial());
			self.descending_x(self.settingsViewModel.settings.plugins.bedlevelvisualizer.descending_x());
			self.descending_y(self.settingsViewModel.settings.plugins.bedlevelvisualizer.descending_y());
			self.graph_z_limits(self.settingsViewModel.settings.plugins.bedlevelvisualizer.graph_z_limits());
		};

		self.onAfterBinding = function() {
			$('div#settings_plugin_bedlevelvisualizer i[data-toggle="tooltip"],div#tab_plugin_bedlevelvisualizer i[data-toggle="tooltip"],div#wizard_plugin_bedlevelvisualizer i[data-toggle="tooltip"],div#settings_plugin_bedlevelvisualizer pre[data-toggle="tooltip"],div#settings_plugin_bedlevelvisualizer input[data-toggle="tooltip"],div#settings_plugin_bedlevelvisualizer div.input-append[data-toggle="tooltip"]').tooltip();
			$('#bedlevelvisualizer_tabs a').on('show.bs.tab', function(event){
				if($(event.target).text() === 'Current Mesh Data'){
					self.settings_active(true);
					return;
				}
				if ($(event.relatedTarget).text() === 'Current Mesh Data'){
					self.settings_active(false);
				}
			});
		};

		self.onSettingsBeforeSave = function() {
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.screw_hub(self.screw_hub());
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.mesh_unit(self.mesh_unit());
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.reverse(self.reverse());
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.showdegree(self.showdegree());
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.show_stored_mesh_on_tab(self.show_stored_mesh_on_tab());
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.imperial(self.imperial());
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.descending_x(self.descending_x());
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.descending_y(self.descending_y());
			if(self.settingsViewModel.settings.plugins.bedlevelvisualizer.colorscale().length === 0) { self.settingsViewModel.settings.plugins.bedlevelvisualizer.colorscale('[[0, "rebeccapurple"],[0.4, "rebeccapurple"],[0.45, "blue"],[0.5, "green"],[0.55, "yellow"],[0.6, "red"],[1, "red"]]');}
			if(self.settingsViewModel.settings.plugins.bedlevelvisualizer.rotation().length === 0) {self.settingsViewModel.settings.plugins.bedlevelvisualizer.rotation(0);}
			if(self.settingsViewModel.settings.plugins.bedlevelvisualizer.timeout().length === 0) {self.settingsViewModel.settings.plugins.bedlevelvisualizer.timeout(1800);}
/*			if(self.settingsViewModel.settings.plugins.bedlevelvisualizer.show_prusa_adjustments()) {
				self.settingsViewModel.settings.plugins.bedlevelvisualizer.use_relative_offsets(true);
				self.settingsViewModel.settings.plugins.bedlevelvisualizer.use_center_origin(true);
			}*/
		};

		self.onSettingsHidden = function() {
			self.settings_active(false);
		};

		self.onEventSettingsUpdated = function () {
			self.mesh_data(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh());
			self.save_mesh(self.settingsViewModel.settings.plugins.bedlevelvisualizer.save_mesh());
			self.save_snapshots(self.settingsViewModel.settings.plugins.bedlevelvisualizer.save_snapshots());
			self.graph_z_limits(self.settingsViewModel.settings.plugins.bedlevelvisualizer.graph_z_limits());
		};

		self.onDataUpdaterPluginMessage = function (plugin, mesh_data) {
			if (plugin !== "bedlevelvisualizer") {
				return;
			}

			if (mesh_data.BLV) {
				switch(mesh_data.BLV) {
					case "BLVPROCESSINGON":
						self.processing(true);
						break;
					case "BLVPROCESSINGOFF":
						self.processing(false);
						break;
					default:
						console.log("Unknown BLV Command: " + mesh_data.BLV);
				}
			}

			var i;
			if (mesh_data.mesh) {
				if (mesh_data.mesh.length > 0) {
					var x_data = [];
					var y_data = [];

					for( i = 0;i <= (mesh_data.mesh[0].length - 1);i++) {
						if ((mesh_data.bed.type === "circular") || self.settingsViewModel.settings.plugins.bedlevelvisualizer.use_center_origin()) {
							x_data.push(Math.round(mesh_data.bed.x_min - (mesh_data.bed.x_max/2)+i/(mesh_data.mesh[0].length - 1)*(mesh_data.bed.x_max - mesh_data.bed.x_min)));
						} else {
							x_data.push(Math.round(mesh_data.bed.x_min+i/(mesh_data.mesh[0].length - 1)*(mesh_data.bed.x_max - mesh_data.bed.x_min)));
						}
					}

					for( i = 0;i <= (mesh_data.mesh.length - 1);i++) {
						if ((mesh_data.bed.type === "circular") || self.settingsViewModel.settings.plugins.bedlevelvisualizer.use_center_origin()) {
							y_data.push(Math.round(mesh_data.bed.y_min - (mesh_data.bed.y_max/2)+i/(mesh_data.mesh.length - 1)*(mesh_data.bed.y_max - mesh_data.bed.y_min)));
						} else {
							y_data.push(Math.round(mesh_data.bed.y_min+i/(mesh_data.mesh.length - 1)*(mesh_data.bed.y_max - mesh_data.bed.y_min)));
						}
					}
					self.drawMesh(mesh_data.mesh,true,x_data,y_data,mesh_data.bed.z_max);
					self.mesh_data(mesh_data.mesh);
					self.mesh_data_x(x_data);
					self.mesh_data_y(y_data);
					self.mesh_data_z_height(mesh_data.bed.z_max);
				}
				return;
			}
			if (mesh_data.error) {
				clearTimeout(self.timeout);
				self.processing(false);
				new PNotify({
					title: 'Bed Visualizer Error',
					text: '<div class="row-fluid"><p>Looks like your settings are not correct or there was an error.</p><p>Please see the <a href="https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/#tips" target="_blank">Readme</a> for configuration tips.</p></div><p><pre style="padding-top: 5px;">'+mesh_data.error+'</pre></p>',
					hide: true
				});
				return;
			}
			if (mesh_data.processing) {
				self.processing(true);
			}
			if (mesh_data.timeout_override) {
				// console.log('Resetting timeout to ' + mesh_data.timeout_override + ' seconds.');
				clearTimeout(self.timeout);
				self.timeout = setTimeout(function() {self.cancelMeshUpdate();new PNotify({title: 'Bed Visualizer Error',text: '<div class="row-fluid">Timeout occured before processing completed. Processing may still be running or there may be a configuration error. Consider increasing the Processing Timeout value in settings and restart OctoPrint.</div>',type: 'error',hide: false});}, (mesh_data.timeout_override*1000));
			}
			return;
		};

		self.drawMesh = function (mesh_data_z,store_data,mesh_data_x,mesh_data_y,mesh_data_z_height) {
			// console.log(mesh_data_z+'\n'+store_data+'\n'+mesh_data_x+'\n'+mesh_data_y+'\n'+mesh_data_z_height);
			// console.log(mesh_data_z);
			clearTimeout(self.timeout);
			self.processing(false);
			if ( self.save_mesh()) {
				if (store_data) {
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh(mesh_data_z);
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_x(mesh_data_x);
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_y(mesh_data_y);
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_z_height(mesh_data_z_height);
					if(self.settingsViewModel.settings.plugins.bedlevelvisualizer.date_locale_format().length > 0) {
						self.settingsViewModel.settings.plugins.bedlevelvisualizer.mesh_timestamp(new Date().toLocaleString(self.settingsViewModel.settings.plugins.bedlevelvisualizer.date_locale_format()));
					} else {
						self.settingsViewModel.settings.plugins.bedlevelvisualizer.mesh_timestamp(new Date().toLocaleString());
					}
					self.settingsViewModel.saveData();
				}
			}

			try {
				var graphcolorscale = (self.settingsViewModel.settings.plugins.bedlevelvisualizer.colorscale().charAt(0) === "[") ? JSON.parse(self.settingsViewModel.settings.plugins.bedlevelvisualizer.colorscale()) : self.settingsViewModel.settings.plugins.bedlevelvisualizer.colorscale();
				if (graphcolorscale.length === 0) graphcolorscale = [[0, "rebeccapurple"],[0.4, "rebeccapurple"],[0.45, "blue"],[0.5, "green"],[0.55, "yellow"],[0.6, "red"],[1, "red"]];
				var data = [{
						z: mesh_data_z,
						x: mesh_data_x,
						y: mesh_data_y,
						type: 'surface',
						colorbar: {
							tickfont: {
								color: $('#tabs_content').css('color')
							}
						},
						autocolorscale: false,
						colorscale: graphcolorscale
					}
				];

				if(self.graph_z_limits().split(",")[0] !== 'auto'){
					data[0]['cmin'] = self.graph_z_limits().split(",")[0];
					data[0]['cmax'] = self.graph_z_limits().split(",")[1];
				}

				var background_color = $('#tabs_content').css('background-color');
				var foreground_color = $('#tabs_content').css('color');
				var camera_position = self.settingsViewModel.settings.plugins.bedlevelvisualizer.camera_position().split(",");

				var layout = {
					//title: 'Bed Leveling Mesh',
					autosize: true,
					plot_bgcolor: background_color,
					paper_bgcolor: background_color,
					margin: {
						l: 0,
						r: 0,
						b: 0,
						t: 0
					},
					scene: {
						camera: {
							eye: {
								x: (camera_position.length === 3) ? camera_position[0] : -1.25,
								y: (camera_position.length === 3) ? camera_position[1] : -1.25,
								z: (camera_position.length === 3) ? camera_position[2] : 0.25
							}
						},
						xaxis: {
							color: foreground_color,
							zerolinecolor: '#00FF00',
							zerolinewidth: 4
						},
						yaxis: {
							color: foreground_color,
							zerolinecolor: '#FF0000',
							zerolinewidth: 4
						},
						zaxis: {
							color: foreground_color,
							range: (self.graph_z_limits().split(",")[0] !== 'auto') ? self.graph_z_limits().split(',') : [-2,2],
							zerolinecolor: '#0000FF',
							zerolinewidth: 4
						}
					}
				};

				var config_options = {
					displaylogo: false,
					showEditInChartStudio: true,
					responsive: true,
					plotlyServerURL: "https://chart-studio.plotly.com",
					modeBarButtonsToRemove: ['resetCameraDefault3d'],
					modeBarButtonsToAdd: [{
						name: 'Move Nozzle',
						icon: Plotly.Icons.autoscale,
						toggle: true,
						click: function(gd, ev) {
								var button = ev.currentTarget;
								var button_enabled = button._previousVal || false;
								if (!button_enabled) {
									gd.on('plotly_click', function(data) {
											var gcode_command = 'G0 X' + data.points[0].x + ' Y' + data.points[0].y + ' F4000';
											OctoPrint.control.sendGcode([gcode_command]);
										});
									button._previousVal = true;
								} else {
									gd.removeAllListeners('plotly_click');
									button._previousVal = null;
								}
							}
						}]};

				// calculate min/max value.
				let s_min = Math.min(...mesh_data_z.flat());
				let s_max = Math.max(...mesh_data_z.flat());
				let s_var = s_max - s_min;

				layout.annotations = [{
					xref: 'paper',
					yref: 'paper',
					x: 1,
					xanchor: 'right',
					y: 0,
					yanchor: 'bottom',
					text: 'Min: ' + s_min + '<br>Max: ' + s_max + '<br>Var: ' + s_var,
					showarrow: false,
					font: {
						color: foreground_color
					}
				}];

				// Prusa Bed Level Correction
				if(self.settingsViewModel.settings.plugins.bedlevelvisualizer.show_prusa_adjustments()) {
					let back_half = mesh_data_z.slice(0, mesh_data_z.length/2).join().split(',');
					let front_half = mesh_data_z.slice(mesh_data_z.length/2).join().split(',');
					let left_half = (back_half.slice(0,back_half.length/2) + front_half.slice(0,front_half.length/2)).split(',');
					let right_half = (back_half.slice(back_half.length/2) + front_half.slice(front_half.length/2)).split(',');

					let back_half_total = 0;
					let front_half_total = 0;
					let left_half_total = 0;
					let right_half_total = 0;

					for(let i=0;i<back_half.length;i++){
						back_half_total += parseFloat(back_half[i]);
					}

					for(let i=0;i<front_half.length;i++){
						front_half_total += parseFloat(front_half[i]);
					}

					for(let i=0;i<left_half.length;i++){
						left_half_total += parseFloat(left_half[i]);
					}

					for(let i=0;i<right_half.length;i++){
						right_half_total += parseFloat(right_half[i]);
					}

					let back_half_um = Math.round((back_half_total/back_half.length)*1000);
					let front_half_um = Math.round((front_half_total/front_half.length)*1000);
					let left_half_um = Math.round((left_half_total/left_half.length)*1000);
					let right_half_um = Math.round((right_half_total/right_half.length)*1000);
					layout.annotations.push({xref: 'paper',
						yref: 'paper',
						x: 1,
						xanchor: 'right',
						y: 1,
						yanchor: 'top',
						text: 'Back [um]:' + back_half_um + '<br>Front [um]:' + front_half_um + '<br>Left [um]:' + left_half_um + '<br>Right [um]:' + right_half_um,
						showarrow: false,
						font: {
							color: foreground_color
						}
					});
				}

				// graph surface
				Plotly.react('bedlevelvisualizergraph', data, layout, config_options).then(self.postPlotHandler);
			} catch(err) {
				new PNotify({
						title: 'Bed Visualizer Error',
						text: '<div class="row-fluid">Errors while attempting render of mesh data.</div><div class="row-fluid">Error:</div><div class="row-fluid"><pre style="padding-top: 5px;">'+err+'</pre></div><div class="row-fluid">Received Data:</div><div class="row-fluid"><pre style="padding-top: 5px;">'+data+'</pre></div>',
						type: 'error',
						hide: false
						});
			}
		};

		self.postPlotHandler = function () {
				if(self.save_snapshots()){
					var export_filename = ((self.settingsViewModel.settings.appearance.name().length > 0) ? self.settingsViewModel.settings.appearance.name() : 'OctoPrint') + '_' + moment().format('YYYY-MM-DD_HH-mm-ss');
					Plotly.downloadImage('bedlevelvisualizergraph',{filename: export_filename});
				}
		};

		self.onAfterTabChange = function (current, previous) {
			if (current === "#tab_plugin_bedlevelvisualizer" && self.loginStateViewModel.isUser() && !self.processing()) {
				if (!self.save_mesh()) {
					if (self.controlViewModel.isOperational() && !self.controlViewModel.isPrinting()) {
						self.updateMesh();
					}
				} else if (self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh().length > 0) {
					self.drawMesh(self.mesh_data(),false,self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_x(),self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_y(),self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_z_height());
				}
			}
		};

		self.updateMesh = function () {
			self.processing(true);
			var gcode_cmds = self.settingsViewModel.settings.plugins.bedlevelvisualizer.command().split("\n");
			if (gcode_cmds.indexOf("@BEDLEVELVISUALIZER") == -1) {
				gcode_cmds = ["@BEDLEVELVISUALIZER"].concat(gcode_cmds);
			}
			// clean extraneous code
			gcode_cmds = gcode_cmds.filter(function(array_val) {
					return Boolean(array_val) === true;
				});

			self.timeout = setTimeout(function() {self.cancelMeshUpdate();new PNotify({title: 'Bed Visualizer Error',text: '<div class="row-fluid">Timeout occured before processing completed. Processing may still be running or there may be a configuration error. Consider increasing the Processing Timeout value in settings and restart OctoPrint.</div>',type: 'error',hide: false});}, (parseInt(self.settingsViewModel.settings.plugins.bedlevelvisualizer.timeout())*1000));
			// console.log(gcode_cmds);

			OctoPrint.control.sendGcode(gcode_cmds);
		};

		self.cancelMeshUpdate = function() {
			$.ajax({
				url: API_BASEURL + "plugin/bedlevelvisualizer",
				type: "GET",
				dataType: "json",
				data: {stopProcessing:true},
				contentType: "application/json; charset=UTF-8"
			}).done(function(data){
				if(data.stopped){
					clearTimeout(self.timeout);
					self.processing(false);
				}
				});
		};

		// Custom command list

		self.showEditor = function(data) {
			self.selected_command(data);
			$('#BedLevelVisulizerCommandEditor').modal('show');
		};

		self.copyCommand = function(data) {
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands.push({
																					icon: ko.observable(data.icon()),
																					label: ko.observable(data.label()),
																					tooltip: ko.observable(data.tooltip()),
																					command: ko.observable(data.command()),
																					confirmation: ko.observable(data.confirmation()),
																					message: ko.observable(data.message()),
																					enabled_while_printing: ko.observable(data.enabled_while_printing()),
																					enabled_while_graphing: ko.observable(data.enabled_while_graphing()),
																					input: ko.observableArray(data.input())});
		};

		self.moveCommandUp = function(data) {
			var currentIndex = self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands.indexOf(data);
			if (currentIndex > 0) {
				var queueArray = self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands();
				self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands.splice(currentIndex-1, 2, queueArray[currentIndex], queueArray[currentIndex - 1]);
			}
		};

		self.moveCommandDown = function(data) {
			var currentIndex = self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands.indexOf(data);
			if (currentIndex < self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands().length - 1) {
				var queueArray = self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands();
				self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands.splice(currentIndex, 2, queueArray[currentIndex + 1], queueArray[currentIndex]);
			}
		};

		self.addCommand = function() {
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands.push({icon: ko.observable('fas fa-gear'), label: ko.observable(''), tooltip: ko.observable(''), command: ko.observable(''), confirmation: ko.observable(false), message: ko.observable(''), input: ko.observableArray([]), enabled_while_printing: ko.observable(false), enabled_while_graphing: ko.observable(false)});
		};

		self.removeCommand = function(data) {
			self.settingsViewModel.settings.plugins.bedlevelvisualizer.commands.remove(data);
		};

		self.addParameter = function(data) {
			data.input.push({label: ko.observable(''), parameter: ko.observable(''), value: ko.observable('')});
		};

		self.insertParameter = function(data) {
			var text = self.selected_command().command();
			text += '%(' + data.parameter() + ')s';
			self.selected_command().command(text);
			// console.log(data);
		};

		self.removeParameter = function(data) {
			var text = self.selected_command().command();
			var search = '%\\(' + data.parameter() + '\\)s';
			var re = new RegExp(search,"gm");
			var new_text = text.replace(re, '');
			self.selected_command().command(new_text);
			self.selected_command().input.remove(data);
		};

		self.runCustomCommand = function(data) {
			var gcode_cmds = data.command().split("\n");
			var parameters = {};

			// clean extraneous code
			gcode_cmds = gcode_cmds.filter(function(array_val) {
					var x = Boolean(array_val);
					return x === true;
				});
			if (data.input().length > 0) {
				_.each(data.input(), function (input) {
					if (!input.hasOwnProperty("parameter") || !input.hasOwnProperty("value")) {
						return;
					}
					parameters[input.parameter()] = input.value();
				});
			}
			if (data.confirmation()) {
				showConfirmationDialog({
					message: data.message(),
					onproceed: function () {
						OctoPrint.control.sendGcodeWithParameters(gcode_cmds, parameters);
					}
				});
			} else {
				OctoPrint.control.sendGcodeWithParameters(gcode_cmds, parameters);
			}
			event.currentTarget.blur();
		};
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: bedlevelvisualizerViewModel,
		dependencies: ["settingsViewModel", "controlViewModel", "loginStateViewModel"],
		elements: ["#settings_plugin_bedlevelvisualizer", "#tab_plugin_bedlevelvisualizer", "#wizard_plugin_bedlevelvisualizer"]
	});
});
