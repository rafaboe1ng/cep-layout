from flask import Flask, render_template, jsonify, redirect, url_for, request
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta, date
import os
import math

app = Flask(__name__)

# Banco de dados
DB_CONN_STRING = os.getenv(
    "DB_CONN_STRING_VM",
    "mysql+pymysql://nikolas:EFD%40puc2023@54.232.255.210/db_puc",
)
engine = create_engine(DB_CONN_STRING)


def _parse_date(value: str) -> date:
    """Parse a string in YYYY-MM-DD format to a date object."""
    return datetime.strptime(value, "%Y-%m-%d").date()


def _previous_month_range(day: date) -> tuple[date, date]:
    """Return the first and last day of the month preceding the given day."""
    first_of_month = day.replace(day=1)
    last_previous = first_of_month - timedelta(days=1)
    first_previous = last_previous.replace(day=1)
    return first_previous, last_previous

@app.route('/', methods=['GET', 'POST'])
def dashboard():
    if request.method == 'POST':
        return redirect(url_for('dashboard'))
    return render_template('dashboard_cep.html')


@app.route('/about')
def about():
    return 'About'


@app.route('/get_counts', methods=['GET'])
def get_counts():
    start = request.args.get('start')
    end = request.args.get('end')
    cells = request.args.getlist('cell')
    if not start or not end:
        return jsonify({'success': False, 'message': 'Missing date range'}), 400

    base_query = (
        """
        SELECT COUNT(si.id) AS total_inspections,
               COUNT(sie.error_id) AS total_defects
        FROM sample_inspection si
        LEFT JOIN sample_inspection_error sie ON si.id = sie.sample_inspection_id
        WHERE si.audit = 0 AND DATE(si.ts) BETWEEN :start AND :end
        """
    )
    params = {'start': start, 'end': end}
    if cells:
        placeholders = ",".join(f":cell{i}" for i in range(len(cells)))
        base_query += f" AND si.cell_id IN ({placeholders})"
        for i, cell in enumerate(cells):
            params[f"cell{i}"] = cell

    try:
        with engine.connect() as conn:
            result = conn.execute(text(base_query), params).mappings().first()
        return jsonify(
            {
                'success': True,
                'total_inspections': result["total_inspections"],
                'total_defects': result["total_defects"],
            }
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/get_errors', methods=['GET'])
def get_errors():
    try:
        query = """
            SELECT cod, name
            FROM error
            WHERE delete_user_id IS NULL
            ORDER BY cod
        """
        with engine.connect() as conn:
            result = conn.execute(text(query)).mappings().all()
        errors = [{'id': row['cod'], 'name': row['name']} for row in result]
        return jsonify({'success': True, 'errors': errors})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/get_top_defects', methods=['GET'])
def get_top_defects():
    start = request.args.get('start')
    end = request.args.get('end')
    order = request.args.get('order', 'desc').lower()
    limit = request.args.get('limit', type=int, default=10)
    cells = request.args.getlist('cell')
    ids = request.args.getlist('id')
    if not start or not end:
        return jsonify({'success': False, 'message': 'Missing date range'}), 400
    params = {'start': start, 'end': end}

    if ids:
        id_placeholders = ",".join(f":id{i}" for i in range(len(ids)))
        for i, id_ in enumerate(ids):
            params[f"id{i}"] = id_
        inner_query = (
            """
            SELECT e.cod AS cod, COUNT(*) AS total
            FROM sample_inspection si
            JOIN sample_inspection_error sie ON si.id = sie.sample_inspection_id
            JOIN error e ON sie.error_id = e.id
            WHERE si.audit = 0 AND DATE(si.ts) BETWEEN :start AND :end
            """
        )
        if cells:
            cell_placeholders = ",".join(f":cell{i}" for i in range(len(cells)))
            inner_query += f" AND si.cell_id IN ({cell_placeholders})"
            for i, cell in enumerate(cells):
                params[f"cell{i}"] = cell
        inner_query += " GROUP BY e.cod"
        base_query = (
            f"""
            SELECT e.cod AS id, e.name AS name, COALESCE(t.total, 0) AS total
            FROM error e
            LEFT JOIN ({inner_query}) t ON t.cod = e.cod
            WHERE e.cod IN ({id_placeholders})
            ORDER BY FIELD(e.cod, {id_placeholders})
            """
        )
    else:
        base_query = (
            """
            SELECT e.cod AS id, e.name AS name, COUNT(*) AS total
            FROM sample_inspection si
            JOIN sample_inspection_error sie ON si.id = sie.sample_inspection_id
            JOIN error e ON sie.error_id = e.id
            WHERE si.audit = 0 AND DATE(si.ts) BETWEEN :start AND :end
            """
        )
        if cells:
            cell_placeholders = ",".join(f":cell{i}" for i in range(len(cells)))
            base_query += f" AND si.cell_id IN ({cell_placeholders})"
            for i, cell in enumerate(cells):
                params[f"cell{i}"] = cell
        base_query += " GROUP BY e.cod, e.name"
        base_query += f" ORDER BY total {'ASC' if order == 'asc' else 'DESC'} LIMIT :limit"
        params['limit'] = limit

    try:
        with engine.connect() as conn:
            result = conn.execute(text(base_query), params).mappings().all()
        defects = [
            {'id': row['id'], 'name': row['name'], 'total': row['total']}
            for row in result
        ]
        return jsonify({'success': True, 'defects': defects})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/get_u_chart', methods=['GET'])
def get_u_chart():
    start = request.args.get('start')
    end = request.args.get('end')
    cells = request.args.getlist('cell')
    error_cod = request.args.get('error')
    if not start or not end:
        return jsonify({'success': False, 'message': 'Missing date range'}), 400

    try:
        start_date = _parse_date(start)
        end_date = _parse_date(end)
        baseline_start, baseline_end = _previous_month_range(start_date)
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format'}), 400

    params = {
        'start': start,
        'end': end,
        'b_start': baseline_start.strftime('%Y-%m-%d'),
        'b_end': baseline_end.strftime('%Y-%m-%d'),
    }

    cell_filter = ''
    if cells:
        placeholders = ','.join(f":cell{i}" for i in range(len(cells)))
        cell_filter = f" AND si.cell_id IN ({placeholders})"
        for i, cell in enumerate(cells):
            params[f"cell{i}"] = cell

    error_join = ''
    error_filter = ''
    if error_cod:
        error_join = ' JOIN error e ON sie.error_id = e.id'
        error_filter = ' AND e.cod = :error_cod'
        params['error_cod'] = error_cod

    delta_days = (end_date - start_date).days
    if delta_days <= 1:
        bucket = "FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(si.ts)/300)*300)"
    elif delta_days <= 3:
        bucket = "FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(si.ts)/1800)*1800)"
    elif delta_days <= 7:
        bucket = "FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(si.ts)/7200)*7200)"
    elif delta_days > 92:
        bucket = (
            "DATE_ADD(:start, INTERVAL FLOOR(DATEDIFF(DATE(si.ts), :start)/14)*14 DAY)"
        )
    else:
        bucket = "DATE(si.ts)"

    baseline_insp_query = f"""
        SELECT COUNT(DISTINCT si.id) AS total
        FROM sample_inspection si
        WHERE si.audit = 0
          AND DATE(si.ts) BETWEEN :b_start AND :b_end
          {cell_filter}
    """

    baseline_defect_query = f"""
        SELECT COUNT(sie.error_id) AS total
        FROM sample_inspection si
        JOIN sample_inspection_error sie ON si.id = sie.sample_inspection_id
        {error_join}
        WHERE si.audit = 0
          AND DATE(si.ts) BETWEEN :b_start AND :b_end
          {cell_filter}
          {error_filter}
    """

    daily_insp_query = f"""
        SELECT {bucket} AS date, COUNT(DISTINCT si.id) AS total
        FROM sample_inspection si
        WHERE si.audit = 0
          AND DATE(si.ts) BETWEEN :start AND :end
          {cell_filter}
        GROUP BY date
    """

    daily_defect_query = f"""
        SELECT {bucket} AS date, COUNT(sie.error_id) AS total
        FROM sample_inspection si
        JOIN sample_inspection_error sie ON si.id = sie.sample_inspection_id
        {error_join}
        WHERE si.audit = 0
          AND DATE(si.ts) BETWEEN :start AND :end
          {cell_filter}
          {error_filter}
        GROUP BY date
    """

    try:
        with engine.connect() as conn:
            insp_base = conn.execute(text(baseline_insp_query), params).scalar() or 0
            defect_base = conn.execute(text(baseline_defect_query), params).scalar() or 0
            insp_rows = conn.execute(text(daily_insp_query), params).mappings().all()
            defect_rows = conn.execute(text(daily_defect_query), params).mappings().all()
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

    u_bar = defect_base / insp_base if insp_base else 0.0

    insp_map = {row['date']: row['total'] for row in insp_rows}
    defect_map = {row['date']: row['total'] for row in defect_rows}
    dates = sorted(set(insp_map) | set(defect_map))

    data = []
    wls_points = []
    for idx, dt in enumerate(dates, start=1):
        insp = insp_map.get(dt, 0) or 0
        defects = defect_map.get(dt, 0) or 0
        u = defects / insp if insp else 0.0
        sigma = (u_bar / insp) ** 0.5 if insp else 0.0
        ucl = u_bar + 3 * sigma
        lcl = max(0.0, u_bar - 3 * sigma)
        if sigma and abs((u - u_bar) / sigma) < 3 and insp > 0:
            wls_points.append((idx, u, insp))
        data.append({
            'date': dt if isinstance(dt, str) else dt.isoformat(),
            'u': round(u, 4),
            'ucl': round(ucl, 4),
            'lcl': round(lcl, 4),
            'total_inspections': insp,
            'total_defects': defects,
        })

    slope = 0.0
    intercept = u_bar
    if len(wls_points) >= 2:
        sw = sum(w for _, _, w in wls_points)
        sx = sum(x * w for x, _, w in wls_points)
        sy = sum(y * w for _, y, w in wls_points)
        sxx = sum(x * x * w for x, _, w in wls_points)
        sxy = sum(x * y * w for x, y, w in wls_points)
        den = sw * sxx - sx * sx
        if den != 0:
            slope = (sw * sxy - sx * sy) / den
            intercept = (sy - slope * sx) / sw
        else:
            intercept = sy / sw if sw else u_bar

    for idx, item in enumerate(data, start=1):
        item['trend'] = round(intercept + slope * idx, 4)

    angle = math.degrees(math.atan(slope))

    return jsonify(
        {'success': True, 'u_bar': round(u_bar, 4), 'angle': round(angle, 2), 'data': data}
    )

if __name__ == '__main__':
    app.run(debug=True)
