<Query Kind="Statements">
  <NuGetReference>CssParser</NuGetReference>
  <Namespace>BTR.Evolution.Data</Namespace>
  <Namespace>CSSParser</Namespace>
  <Namespace>CSSParser.ExtendedLESSParser.ContentSections</Namespace>
</Query>

foreach( var file in new DirectoryInfo( @"C:\BTR\KATApp\client\css" ).GetFiles( "*.css" ) )
{
	var fileName = file.Name;
	var outputFileName = $@"C:\BTR\KATApp\public\css\{Path.GetFileNameWithoutExtension(fileName)}.kat.css";
	if (File.Exists(outputFileName))
	{
		File.Delete(outputFileName);
	}

	using (var output = new StreamWriter(outputFileName))
	{
		foreach (var rule in CSSParser.ExtendedLESSParser.LessCssHierarchicalParser.ParseIntoStructuredData(
			Parser.ParseCSS(File.ReadAllText(@"C:\BTR\KATApp\client\css\" + fileName))
		))
		{
			var mq = rule as CSSParser.ExtendedLESSParser.ContentSections.MediaQuery;
			var s = rule as CSSParser.ExtendedLESSParser.ContentSections.Selector;

			Func<IEnumerable<ICSSFragment>, string[]> getStyles = fragments =>
			{
				var styles = new List<string>();
				
				string currentProperty = null;
				string currentStyle = null;

				Action addStyle = () =>
				{
					if (currentProperty != null)
					{
						styles.Add($"{currentProperty}: {currentStyle};");
					}
				};

				foreach( var f in fragments )
				{
					var n = f as StylePropertyName;
					var v = f as StylePropertyValue;
					
					if ( !string.IsNullOrEmpty( n?.Value ) && !n.Value.StartsWith( "base64" ) )
					{
						addStyle();
						currentProperty = n.Value;
					}
					else if ( n?.Value.StartsWith( "base64" ) ?? false )
					{
						currentStyle += n.Value;
					}
					else if ( currentStyle?.StartsWith( "url(data" ) ?? false )
					{
						currentStyle += ( ":" + v.ValueSegments.First() + ";" );
					}
					else
					{
						currentStyle = string.Join(" ", v.ValueSegments);
					}
				}
				addStyle();
				
				return styles.ToArray();
			};
			
			if (s != null)
			{
				var selectors = 
					string.Join(
						"," + Environment.NewLine, 
						s.Selectors.Select(i => i.Value.StartsWith( "body" )
							? i.Value.Split( ' ' )[ 0 ] + " .kat-app-css " + string.Join( " ", i.Value.Split( ' ' ).Skip( 1 ) ) 
							: i.Value.StartsWith( ".kat-app-css." ) // Anything that can be 'nested' but I want to scope my css, add this prefix (i.e. tooltips are only 'one at a time' and appended to the 'body' so I can't wrap inside kat-app-css)
								? i.Value
								: $".kat-app-css {i.Value}" 
						)
					);
				var styles = getStyles( s.ChildFragments );

				output.WriteLine($"{selectors} {{" + Environment.NewLine +
				$"\t{string.Join(Environment.NewLine + "\t", styles)}" + Environment.NewLine +
				"}");
			}
			if (mq != null)
			{
				var media = string.Join("," + Environment.NewLine, mq.Selectors.Select(i => i.Value));
				output.Write($"{media} {{" + Environment.NewLine);

				foreach (Selector cf in mq.ChildFragments)
				{
					var selectors =
						string.Join("," + Environment.NewLine + "\t",
							cf.Selectors.Select(i => i.Value.StartsWith("body")
								? i.Value.Split(' ')[0] + " .kat-app-css " + string.Join(" ", i.Value.Split(' ').Skip(1))
								: $".kat-app-css {i.Value}"
							)
						);
					var styles = getStyles(cf.ChildFragments);

					output.Write(
						$"\t{selectors} {{" + Environment.NewLine +
						$"\t\t{string.Join(Environment.NewLine + "\t\t", styles)}" + Environment.NewLine +
						"\t}" + Environment.NewLine
					);
				}

				output.Write("}" + Environment.NewLine);
			}
		}
	}
	
	File.ReadAllText( outputFileName ).Dump();
}