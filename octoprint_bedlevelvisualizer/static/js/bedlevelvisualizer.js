$(function () {
	function bedlevelvisualizerViewModel(parameters) {
		var self = this;

		self.settingsViewModel = parameters[0];
		self.controlViewModel = parameters[1];
		self.loginStateViewModel = parameters[2];

		self.processing = ko.observable(false);
		self.mesh_data = ko.observableArray([]);
		self.save_mesh = ko.observable();
		self.mesh_status = ko.computed(function(){
			var return_value = 'Polling for mesh data.';
			if (self.save_mesh()) {
				return_value = 'Using saved mesh data.';
			}
			return return_value;
		});
		
		self.onBeforeBinding = function() {
			self.mesh_data(self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh());
			self.save_mesh(self.settingsViewModel.settings.plugins.bedlevelvisualizer.save_mesh());
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
				console.log(mesh_data.mesh);
				self.drawMesh(mesh_data.mesh,true);
			}
			return;
		};

		self.drawMesh = function (mesh_data,store_data) {
			self.processing(false);
			if(self.save_mesh()){
				if(store_data){
					self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh(mesh_data);
					self.settingsViewModel.saveData();
				};
			}
			var data = [{
					z: mesh_data,
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
							z: 1.25
						}
					}
				}
			};
			Plotly.react('bedlevelvisualizergraph', data, layout);
		};

		self.onAfterTabChange = function (current, previous) {
			if (current === "#tab_plugin_bedlevelvisualizer" && self.controlViewModel.isOperational() && !self.controlViewModel.isPrinting() && self.loginStateViewModel.isUser() && !self.processing()) {
				if (!self.save_mesh()) {
					self.updateMesh();
				} else {
					if(!self.settingsViewModel.settings.plugins.bedlevelvisualizer.stored_mesh().length > 0){
						self.updateMesh();
					} else {
						self.drawMesh(self.mesh_data());
					}
				}
				return;
			}
			if (previous === "#tab_plugin_bedlevelvisualizer") {
				//Plotly.purge('bedlevelvisualizergraph');
			}
		};

		self.updateMesh = function () {
			self.processing(true);
			OctoPrint.control.sendGcode(self.settingsViewModel.settings.plugins.bedlevelvisualizer.command().split("\n"));
		};
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: bedlevelvisualizerViewModel,
		dependencies: ["settingsViewModel", "controlViewModel", "loginStateViewModel"],
		elements: ["#settings_plugin_bedlevelvisualizer", "#tab_plugin_bedlevelvisualizer"]
	});
});
