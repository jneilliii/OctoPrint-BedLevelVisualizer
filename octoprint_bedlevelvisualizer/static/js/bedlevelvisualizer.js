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
		self.mesh_status = ko.computed(function(){
			if(self.processing()){
				return 'Collecting mesh data.';
			}
			if (self.save_mesh() && self.mesh_data().length > 0) {
				return 'Using saved mesh data from ' + self.settingsViewModel.settings.plugins.bedlevelvisualizer.mesh_timestamp() + '.';
			} else {
				return 'Update mesh.'
			}
		});
		
		self.onBeforeBinding = function() {
			self.mesh_data(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh());
			self.mesh_data_x(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_x());
			self.mesh_data_y(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_y());
			self.mesh_data_z_height(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_z_height());
			self.save_mesh(self.settingsViewModel.settings.plugins.bedlevelvisualizer.save_mesh());
		}
		
		self.onAfterBinding = function() {
			$('div#settings_plugin_bedlevelvisualizer i[data-toggle="tooltip"],div#tab_plugin_bedlevelvisualizer i[data-toggle="tooltip"],div#wizard_plugin_bedlevelvisualizer i[data-toggle="tooltip"],div#settings_plugin_bedlevelvisualizer pre[data-toggle="tooltip"]').tooltip();
		}
		
		self.onEventSettingsUpdated = function (payload) {
			self.mesh_data(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh());
			self.save_mesh(self.settingsViewModel.settings.plugins.bedlevelvisualizer.save_mesh());
		}

		self.onDataUpdaterPluginMessage = function (plugin, mesh_data) {
			if (plugin !== "bedlevelvisualizer") {
				return;
			}
			if (mesh_data.mesh) {
				if (mesh_data.mesh.length > 0) {
					var x_data = [];
					var y_data = [];
					for(i = mesh_data.bed.x_min;i <= mesh_data.bed.x_max;i += mesh_data.bed.x_max/(mesh_data.mesh[0].length - 1)){
						if(mesh_data.bed.type == "circular"){
							x_data.push(Math.round((i - mesh_data.bed.x_max/2)));
						} else {
							x_data.push(Math.round(i));
						}
					}
					for(i = mesh_data.bed.y_min;i <= mesh_data.bed.y_max;i += mesh_data.bed.y_max/(mesh_data.mesh.length -1)){
						if(mesh_data.bed.type == "circular"){
							y_data.push(Math.round((i - mesh_data.bed.y_max/2)));
						} else {
							y_data.push(Math.round(i));
						}
					}
					
					self.drawMesh(mesh_data.mesh,true,x_data,y_data,mesh_data.bed.z_max);
				}
				return;
			}
			if (mesh_data.error) {
				new PNotify({
						title: 'Bed Visualizer Error',
						text: '<div class="row-fluid"><p>Looks like your settings are not correct or there was an error.</p><p>Please see the <a href="https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/#tips" target="_blank">Readme</a> for configuration tips.</p></div><p><pre style="padding-top: 5px;">'+mesh_data.error+'</pre></p>',
						hide: true
						});	
				return;
			}
			return;
		};

		self.drawMesh = function (mesh_data_z,store_data,mesh_data_x,mesh_data_y,mesh_data_z_height) {
			// console.log(mesh_data_z+'\n'+store_data+'\n'+mesh_data_x+'\n'+mesh_data_y+'\n'+mesh_data_z_height);
			self.processing(false);
			if(self.save_mesh()){
				if(store_data){
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh(mesh_data_z);
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_x(mesh_data_x);
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_y(mesh_data_y);
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh_z_height(mesh_data_z_height);
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.mesh_timestamp(new Date().toLocaleString());
					self.settingsViewModel.saveData();
				};
			}
			
			try {
				var data = [{
						z: mesh_data_z,
						x: mesh_data_x,
						y: mesh_data_y,
						type: 'surface'
					}
				];

				var layout = {
					//title: 'Bed Leveling Mesh',
					autosize: true,
					margin: {
						l: 0,
						r: 0,
						b: 0,
						t: 0
					},
					scene: {
						camera: {
							eye: {
								x: -1.25,
								y: -1.25,
								z: .25
							}
						},
						zaxis: {
							range: [-2,2]
						}
					}
				};
				Plotly.react('bedlevelvisualizergraph', data, layout);
			} catch(err) {
				new PNotify({
						title: 'Bed Visualizer Error',
						text: '<div class="row-fluid">Looks like your settings are not correct or there was an error.  Please see the <a href="https://github.com/jneilliii/OctoPrint-BedLevelVisualizer/#octoprint-bedlevelvisualizer" target="_blank">Readme</a> for configuration hints.</div><pre style="padding-top: 5px;">'+err+'</pre>',
						type: 'error',
						hide: false
						});
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
				return;
			}
			
			if (previous === "#tab_plugin_bedlevelvisualizer") {
				//Plotly.purge('bedlevelvisualizergraph');
			}
		};

		self.updateMesh = function () {
			self.processing(true);
			var gcode_cmds = self.settingsViewModel.settings.plugins.bedlevelvisualizer.command().split("\n");
			if (gcode_cmds.indexOf("@BEDLEVELVISUALIZER") == -1){
				gcode_cmds = ["@BEDLEVELVISUALIZER"].concat(gcode_cmds);
			}
			// clean extraneous code
			gcode_cmds = gcode_cmds.filter(function(array_val) {
					var x = Boolean(array_val);
					return x == true;
				});
				
			console.log(gcode_cmds);
				
			OctoPrint.control.sendGcode(gcode_cmds);
		};
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: bedlevelvisualizerViewModel,
		dependencies: ["settingsViewModel", "controlViewModel", "loginStateViewModel"],
		elements: ["#settings_plugin_bedlevelvisualizer", "#tab_plugin_bedlevelvisualizer", "#wizard_plugin_bedlevelvisualizer"]
	});
});
