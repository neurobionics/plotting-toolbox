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
									(await vscode.window.showQuickPick(
										columnNames,
										{
											placeHolder: "Select the X column",
										}
									)) || "";
								const yColumn =
									(await vscode.window.showQuickPick(
										columnNames,
										{
											placeHolder: "Select the Y column",
										}
									)) || "";

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

								panel.webview.html = getWebviewContent(
									data,
									xColumn,
									yColumn
								);
							} else {
								vscode.window.showErrorMessage(
									"Please open a CSV file with data!"
								);
							}
						});
				} else {
					vscode.window.showErrorMessage(
						"Please open a CSV file to plot!"
					);
				}
			}
		}
	);

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getWebviewContent(data: any[], xColumn: string, yColumn: string) {
	return `<!DOCTYPE html>
    <html>
    <head>
        <title>CSV Plotter</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
            body {
                background-color: #1e1e1e;
                color: #d4d4d4;
                font-family: Arial, sans-serif;
            }
            #plot {
                width: 100%;
                height: 100vh;
            }
            #controls {
                margin: 10px;
            }
            button {
                background-color: #007acc;
                color: white;
                border: none;
                padding: 10px;
                cursor: pointer;
            }
            button:hover {
                background-color: #005f99;
            }
        </style>
    </head>
    <body>
        <div id="plot"></div>
        <script>
            const x = ${JSON.stringify(data.map((row) => row[xColumn || ""]))};
            const y = ${JSON.stringify(data.map((row) => row[yColumn || ""]))};
            const plotData = [
                {
                    x: x,
                    y: y,
                    type: 'scatter',
                    mode: 'lines+markers',
                    marker: { color: 'red' },
                    line: { color: 'blue' }
                },
            ];
            const layout = {
                title: '${yColumn} vs ${xColumn}',
                plot_bgcolor: '#1e1e1e',
                paper_bgcolor: '#1e1e1e',
                font: {
                    color: '#d4d4d4'
                }
            };
            Plotly.newPlot('plot', plotData, layout);
        </script>
    </body>
    </html>`;
}
