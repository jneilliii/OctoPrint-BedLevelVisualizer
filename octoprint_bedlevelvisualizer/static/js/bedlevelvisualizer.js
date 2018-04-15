$(function () {
	function bedlevelvisualizerViewModel(parameters) {
		var self = this;
		
		self.settingsViewModel = parameters[0];
		self.controlViewModel = parameters[1];
		self.loginStateViewModel = parameters[2];
		
		self.command = ko.observable();
		self.processing = ko.observable(false);
		self.loadedData = ko.observableArray();
		
		self.onBeforeBinding = function() {
			self.command(self.settingsViewModel.settings.plugins.bedlevelvisualizer.command());
		}
		
		self.onEventSettingsUpdated = function (payload) {
			self.command(self.settingsViewModel.settings.plugins.bedlevelvisualizer.command());
		}
		
		self.onDataUpdaterPluginMessage = function(plugin, mesh_data) {
			if (plugin != "bedlevelvisualizer") {
				return;
			}
			if (mesh_data.mesh) {
				self.loadedData(mesh_data.mesh);
				self.processing(false);
				self.controlViewModel.sendCustomCommand({type:'command',command:'M155 S3'});
 				var data = [{
					z: mesh_data.mesh,
					type: 'surface'
				}];
				
				var layout = {
					//title: 'Bed Leveling Mesh',
					autosize: true,
					margin: {
						l: 0,
						r: 0,
						b: 0,
						t: 0,
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
				Plotly.newPlot('bedlevelvisualizergraph', data, layout);
			}
		}
		
		self.onAfterTabChange = function (current, previous) {
			if (current == "#tab_plugin_bedlevelvisualizer" && self.controlViewModel.isOperational() && !self.controlViewModel.isPrinting() && self.loginStateViewModel.isUser() && !self.processing()) {
				if(!self.loadedData().length > 0) {
					self.updateMesh();
				}
			}
			if (previous == "#tab_plugin_bedlevelvisualizer") {
				Plotly.purge('bedlevelvisualizergraph');
			}
		};
		
		self.updateMesh = function(){
			self.processing(true);
			self.controlViewModel.sendCustomCommand({type:'command',command:'M155 S0'});
			self.controlViewModel.sendCustomCommand({type:'command',command:self.settingsViewModel.settings.plugins.bedlevelvisualizer.command()});
		}
	}
	
	OCTOPRINT_VIEWMODELS.push({
			construct: bedlevelvisualizerViewModel,
			dependencies: [ "settingsViewModel","controlViewModel","loginStateViewModel" ],
			elements:[ "#tab_plugin_bedlevelvisualizer" ]
	});
});