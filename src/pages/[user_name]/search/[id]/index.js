import Head from 'next/head'
import Error from 'next/error'
import Api from '~api'
import { RAINDROPS_PER_PAGE } from '~config/raindrops'

import Page from '~co/page'
import Raindrops from '~co/raindrops/listing'
import Field from '~co/search/field'
import Tags from '~co/search/tags'
import Sort from '~co/raindrops/sort'
import Path from '~co/raindrops/path'
import Toolbar from '~co/layout/toolbar'

export async function getStaticPaths() { return { paths: [], fallback: 'blocking' } }

export async function getStaticProps({ params: { id, user_name, options } }) {
	options = Object.fromEntries(new URLSearchParams(options))
	options.sort = options.sort || (options.search?.length ? 'score' : '-created')
	options.perpage = RAINDROPS_PER_PAGE

	const [ collection, raindrops, user ] = await Promise.all([
		Api.collection.get(id),
		Api.raindrops.get(id, options),
		Api.user.getByName(user_name)
	])

	//notFound: true doesn't refresh cached pages :( so instead do this:
	if (!collection || !user)
		return {
			props: {
				statusCode: 404
			},
			revalidate: 10
		}

	const filters = !options.page ? await Api.filters.get(id, options) : {}
	const collections = await Api.collections.get(user._id)

	return {
		props: {
			collection,
			collections,
			raindrops,
			filters,
			user,
			options
		},
		revalidate: 3
	}
}

export default function SearchScreen({ statusCode, collection, collections, raindrops, filters, user, options }) {
	if (statusCode)
		return <Error statusCode={statusCode} />
		
	return (
		<Page.Wrap
			wide={collection.view == 'grid' || collection.view == 'masonry'}
			accentColor={collection.color}>
			<Head>
				<title>Search {collection.title}</title>
				{!!collection.cover?.length && (
					<link rel='icon' type='image/png' href={collection.cover[0]} />
				)}

				<meta name='robots' content='noindex' />
			</Head>

			<Path 
				self
				collection={collection}
				collections={collections}
				user={user} />

			<Page.Header.Wrap>
				<Page.Header.Title>
					<Field />
				</Page.Header.Title>
			</Page.Header.Wrap>

			<Page.Subheader>
				<Tags
					{...filters} />
			</Page.Subheader>

			<Page.Content>
				<Toolbar.Wrap>
					<Toolbar.Title>
						Found bookmarks
					</Toolbar.Title>

					<Toolbar.Buttons>
						<Sort options={options} />
					</Toolbar.Buttons>
				</Toolbar.Wrap>

				<Raindrops 
					collection={collection}
					collections={collections}
					items={raindrops.items}
					user={user} />
			</Page.Content>

			<Page.Pagination 
				page={options.page}
				perpage={options.perpage}
				count={raindrops.count}
				force={raindrops.items.length==options.perpage ? 'next' : true} />

			<Page.Footer />
		</Page.Wrap>
	)
}