import * as vscode from "vscode";
import * as fs from "fs";
import csv from "csv-parser";

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log("CSV Plotter extension is now active!");

	// Register the command
	let disposable = vscode.commands.registerCommand(
		"csv-plotter.plot",
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				const document = editor.document;
				const fileName = document.fileName;

				if (fileName.endsWith(".csv")) {
					vscode.window.showInformationMessage(
						"CSV Plotter command executed!"
					);

					// Read the CSV file

					const data: any[] = [];
					fs.createReadStream(fileName)
						.pipe(csv())
						.on("data", (row) => {
							data.push(row);
						})
						.on("end", async () => {
							// get the column names
							if (data.length > 0) {
								const columnNames = Object.keys(data[0]);
								// Show the QuickPick
								const xColumn =
									await vscode.window.showQuickPick(
										columnNames,
										{
											placeHolder: "Select the X column",
										}
									);
								const yColumn =
									await vscode.window.showQuickPick(
										columnNames,
										{
											placeHolder: "Select the Y column",
										}
									);

								vscode.window.showInformationMessage(
									`Plotting ${xColumn} vs ${yColumn}`
								);

								// plot the data in a new tab
								const panel = vscode.window.createWebviewPanel(
									"csvPlotter",
									"CSV Plotter",
									vscode.ViewColumn.One,
									{
										enableScripts: true,
									}
								);

								panel.webview.html = `<!DOCTYPE html>
								<html>
								<head>
									<title>CSV Plotter</title>
									<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
								</head>
								<body>
									<div id="plot"></div>
									<script>
										const x = ${JSON.stringify(data.map((row) => row[xColumn || ""]))};
										const y = ${JSON.stringify(data.map((row) => row[yColumn || ""]))};
										const data = [
											{
												x: x,
												y: y,
												type: 'scatter',
											},
										];
										Plotly.newPlot('plot', data);
									</script>
								</body>
								</html>`;
							} else {
								vscode.window.showErrorMessage(
									"Please open a CSV file with data!"
								);
							}
						});

					// Show the column names in the QuickPick
				} else {
					vscode.window.showErrorMessage(
						"Please open a CSV file to plot!"
					);
				}
			}
		}
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
