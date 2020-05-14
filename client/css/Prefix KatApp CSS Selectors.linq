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

			if (s != null)
			{
				var selectors = string.Join("," + Environment.NewLine, s.Selectors.Select(i => $".kat-app-css {i.Value}"));
				var styles =
					s.ChildFragments.Where(f => f as StylePropertyValue != null).Cast<StylePropertyValue>()
					 .Select(f => $"{f.Property.Value}: {string.Join(" ", f.ValueSegments)};");

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
							cf.Selectors.Select(j => ".kat-app-css " + j.Value)
						);
					var styles =
						cf.ChildFragments.Where(f => f as StylePropertyValue != null).Cast<StylePropertyValue>()
								.Select(f => $"{f.Property.Value}: {string.Join(" ", f.ValueSegments)};");

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
}
